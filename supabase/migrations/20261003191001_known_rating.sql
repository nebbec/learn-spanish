-- L10: the intro's "I already know this" is stored as the rating `known` (Easy in FSRS).
-- See docs/design.md, "Intro, then test". Widens the check on reviews.rating; existing
-- rows are unchanged.

alter table public.reviews drop constraint reviews_rating_check;

alter table public.reviews
  add constraint reviews_rating_check check (rating in ('good', 'nearly', 'again', 'known'));
