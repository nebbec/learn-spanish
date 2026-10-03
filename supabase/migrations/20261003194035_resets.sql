-- L16: resets ("Start over") sync like reviews. A reset is a row of its own, since
-- reviews are append-only: every device drops the reviews made at or before the
-- latest reset when it replays. See docs/design.md, "Reset" and "Data in Supabase".
--
-- Same rules as reviews: owner-only select and insert, never changed, deleted only
-- by the service role (or with the user), and a `seq` download cursor numbered by
-- the shared trigger, so uploads are read in the order they committed.

create table public.resets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id uuid not null,
  reset_at timestamptz not null,
  device_id uuid not null,
  seq bigint not null,
  primary key (user_id, id)
);

create index resets_user_seq on public.resets (user_id, seq);

create trigger resets_sync_seq
  before insert on public.resets
  for each row execute function public.set_sync_seq();

revoke all on public.resets from anon, authenticated;
grant select, insert on public.resets to authenticated;

alter table public.resets enable row level security;

create policy "Read own resets" on public.resets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own resets" on public.resets
  for insert to authenticated with check ((select auth.uid()) = user_id);
