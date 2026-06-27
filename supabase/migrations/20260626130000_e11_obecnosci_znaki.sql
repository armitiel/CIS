-- E11: Więcej oznaczeń obecności w CIS.
-- Dotychczas baza dopuszczała tylko 3 znaki ('p','u','a'). Rozszerzamy o:
--   l = zwolnienie lekarskie (L4)
--   w = dzień wolny (DW)
-- Kody w aplikacji: p=O, u=NU, a=NN, l=L4, w=DW.
-- (Każdy z tych dni może być inaczej rozliczany w świadczeniach — logika kwot
--  zostanie ustawiona zgodnie z przekazanymi zasadami.)
--
-- Wklej w Supabase: SQL Editor → New query → Run. Idempotentne.

do $$
declare c text;
begin
  -- usuń istniejące ograniczenia CHECK na tabeli obecnosci (stare 'p','u','a')
  for c in
    select conname from pg_constraint
    where conrelid = 'public.obecnosci'::regclass and contype = 'c'
  loop
    execute format('alter table public.obecnosci drop constraint %I', c);
  end loop;

  -- nowe, szersze ograniczenie
  alter table public.obecnosci
    add constraint obecnosci_znak_check
    check (znak in ('p', 'u', 'a', 'l', 'w'));
end $$;
