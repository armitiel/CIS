-- E14: po przejsciu z projektow prywatnych na wspolne usuwamy kopie tego
-- samego logicznego projektu utworzone dawniej przez rozne konta zespolu.
-- Dane uczestnikow i pozostalych modulow lacza sie z projektem przez tekstowy
-- projekt_id (= klucz), dlatego usuniecie nadmiarowych wierszy public.projekty
-- nie usuwa ani nie przepina danych uczestnikow.

begin;

lock table public.projekty in share row exclusive mode;

with ranking as (
  select
    id,
    row_number() over (
      partition by klucz
      order by
        (szablon is not null) desc,
        cardinality(sekcje) desc,
        length(trim(nazwa)) desc,
        created_at asc,
        id asc
    ) as pozycja
  from public.projekty
)
delete from public.projekty p
using ranking r
where p.id = r.id
  and r.pozycja > 1;

alter table public.projekty
  drop constraint if exists projekty_user_id_klucz_key;

create unique index if not exists projekty_klucz_unique_idx
  on public.projekty (klucz);

commit;
