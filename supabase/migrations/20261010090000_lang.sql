-- DE2: one project, two languages. Every synced row names the language it belongs
-- to, so the Spanish and German apps share the tables and an account, and a device
-- downloads only its own language's rows. See docs/german.md, "Data" ("Decided in DE2").
--
-- `lang` is 'es' or 'de', 'es' by default, so every existing row is Spanish and an
-- upload that does not name a language is Spanish too. Row-level security is
-- unchanged: a row still belongs to its user only.
--
-- Order of release: push this before deploying code that sends `lang` (that code
-- filters every download by it and fails without the column), and deploy that code
-- to the Spanish project soon after: the Spanish code from before DE2 uploads notes
-- with `on conflict (user_id, card_id)`, which no longer names a unique key, so its
-- note uploads are refused until it is replaced. Its reviews, reports and resets
-- keep working.

alter table public.reviews
  add column lang text not null default 'es' check (lang in ('es', 'de'));
alter table public.notes
  add column lang text not null default 'es' check (lang in ('es', 'de'));
alter table public.card_reports
  add column lang text not null default 'es' check (lang in ('es', 'de'));
alter table public.resets
  add column lang text not null default 'es' check (lang in ('es', 'de'));

-- A card id can be in both decks (hotel-hotel), so a note is one per user, language
-- and card. Reviews, reports and resets are keyed by a UUID and keep their keys.
alter table public.notes drop constraint notes_pkey;
alter table public.notes add primary key (user_id, lang, card_id);

-- Downloads read one user's rows of one language after a cursor, in `seq` order.
-- `seq` stays one shared sequence: a filtered page still ends on a `seq` the next
-- page starts after.
drop index public.reviews_user_seq;
drop index public.notes_user_seq;
drop index public.resets_user_seq;
create index reviews_user_lang_seq on public.reviews (user_id, lang, seq);
create index notes_user_lang_seq on public.notes (user_id, lang, seq);
create index resets_user_lang_seq on public.resets (user_id, lang, seq);
