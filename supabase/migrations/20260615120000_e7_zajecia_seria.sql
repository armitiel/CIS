-- E7: cykliczność zajęć — wspólne ID serii dla terminów wygenerowanych razem.
-- Kolumna nullable: pojedyncze zajęcia mają seria = NULL.

alter table public.zajecia
  add column if not exists seria text;

create index if not exists zajecia_seria_idx
  on public.zajecia (user_id, projekt_id, seria);
