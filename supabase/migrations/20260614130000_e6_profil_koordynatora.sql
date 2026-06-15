------------------------------------------------------------------------------
-- E6: Profil koordynatora
--
-- Rozszerza tabelę public.profil o nazwę wyświetlaną i rolę koordynatora.
-- Polityki RLS (własny wiersz: select/insert/update) są już z E1 — wystarczą.
------------------------------------------------------------------------------

alter table public.profil
  add column if not exists nazwa_wyswietlana text,
  add column if not exists rola text;
