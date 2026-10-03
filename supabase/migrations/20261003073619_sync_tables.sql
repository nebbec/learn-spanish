-- The three synced tables: reviews, notes and card_reports. Each row belongs to
-- one user and only that user can read or write it. See docs/design.md, "Data in
-- Supabase" and "Sync rules".
--
-- Times are timestamptz; the app keeps epoch milliseconds and converts both ways.
-- Card state is not stored here: a device rebuilds it by replaying reviews.

-- Download cursor --------------------------------------------------------------

-- `seq` on reviews and notes is the order rows reached the server, which is what
-- a device's download cursor follows. A plain sequence is not enough: two
-- uploads for the same user can take numbers 5 and 6 and commit as 6 then 5, and
-- a device that read up to 6 in between would never see 5. So a row takes its
-- number only after a lock held per user until commit: a second upload for the
-- same user waits for the first to commit, then takes a higher number. Users do
-- not wait on each other's locks except by hash collision, which only costs time.

create sequence public.sync_seq;

create function public.set_sync_seq()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  new.seq := nextval('public.sync_seq');
  return new;
end;
$$;

-- Reviews ----------------------------------------------------------------------

-- Append-only rating events. A review is never changed or deleted by the app.
create table public.reviews (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  card_id text not null,
  direction text not null check (direction in ('forward', 'reverse')),
  rating text not null check (rating in ('good', 'nearly', 'again')),
  reviewed_at timestamptz not null,
  section text not null check (section in ('learn', 'practice')),
  device_id uuid not null,
  seq bigint not null,
  primary key (user_id, id)
);

create index reviews_user_seq on public.reviews (user_id, seq);

create trigger reviews_sync_seq
  before insert on public.reviews
  for each row execute function public.set_sync_seq();

-- Notes ------------------------------------------------------------------------

-- One note per card. `updated_at` is when the note was edited on the device.
create table public.notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null,
  text text not null,
  updated_at timestamptz not null,
  seq bigint not null,
  primary key (user_id, card_id)
);

create index notes_user_seq on public.notes (user_id, seq);

-- The latest edit wins: an update that is not later than the stored note is
-- skipped, so on equal times the note already here stays. An upsert can then
-- send every unsynced note without reading first.
create function public.keep_later_note()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at <= old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

-- Triggers on the same event fire in name order: keep_later before sync_seq, so
-- a skipped update takes no number.
create trigger notes_keep_later
  before update on public.notes
  for each row execute function public.keep_later_note();

create trigger notes_sync_seq
  before insert or update on public.notes
  for each row execute function public.set_sync_seq();

-- Card reports -----------------------------------------------------------------

-- "Something's off" reports. They only go up: no device downloads them.
create table public.card_reports (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  card_id text not null,
  comment text,
  created_at timestamptz not null,
  primary key (user_id, id)
);

-- Access -----------------------------------------------------------------------

-- Signed-in users get only the commands sync uses; anon gets nothing. Nobody but
-- the service role can delete, and reviews and reports cannot be changed.
revoke all on public.reviews, public.notes, public.card_reports from anon, authenticated;
grant select, insert on public.reviews to authenticated;
grant select, insert, update on public.notes to authenticated;
grant select, insert on public.card_reports to authenticated;
grant usage on sequence public.sync_seq to authenticated;
revoke all on sequence public.sync_seq from anon;

alter table public.reviews enable row level security;
alter table public.notes enable row level security;
alter table public.card_reports enable row level security;

create policy "Read own reviews" on public.reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own reviews" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Read own notes" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own notes" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own notes" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Read own reports" on public.card_reports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own reports" on public.card_reports
  for insert to authenticated with check ((select auth.uid()) = user_id);
