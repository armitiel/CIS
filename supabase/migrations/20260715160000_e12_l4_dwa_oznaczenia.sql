-- E12: dwa jawne oznaczenia zwolnienia lekarskiego.
-- l   = historyczny wpis L4 (pozostaje dla zgodności ze starymi danymi)
-- l21 = zwolnienie lekarskie do 21 dni
-- l22 = zwolnienie lekarskie powyżej 21 dni
-- Idempotentne: zmienia wyłącznie ograniczenie dotyczące kolumny znak.

alter table public.obecnosci
  drop constraint if exists obecnosci_znak_check;

alter table public.obecnosci
  add constraint obecnosci_znak_check
  check (znak in ('p', 'a', 'l', 'l21', 'l22', 'w'));
