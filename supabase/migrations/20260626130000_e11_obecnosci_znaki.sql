-- E11: Oznaczenia obecności w CIS — zgodne z ustawą o zatrudnieniu socjalnym.
-- Dozwolone znaki:
--   p = obecny (O)
--   a = nieobecny nieusprawiedliwiony (NN)
--   l = zwolnienie lekarskie (L4)
--   w = dzień wolny (DW)
-- NU (nieobecność usprawiedliwiona) USUNIĘTE — nie wynika z art. 15 ustawy.
-- Stare wpisy 'u' (jeśli istnieją) są kasowane, bo nie mają już odpowiednika.
--
-- Wklej w Supabase: SQL Editor → New query → Run. Idempotentne.

do $$
declare c text;
begin
  -- usuń istniejące ograniczenia CHECK na tabeli obecnosci
  for c in
    select conname from pg_constraint
    where conrelid = 'public.obecnosci'::regclass and contype = 'c'
  loop
    execute format('alter table public.obecnosci drop constraint %I', c);
  end loop;

  -- usuń nieaktualne wpisy NU ('u'), by nowe ograniczenie nie kolidowało z danymi
  delete from public.obecnosci where znak = 'u';

  -- nowe ograniczenie — bez 'u'
  alter table public.obecnosci
    add constraint obecnosci_znak_check
    check (znak in ('p', 'a', 'l', 'w'));
end $$;
