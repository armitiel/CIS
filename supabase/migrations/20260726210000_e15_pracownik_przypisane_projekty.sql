-- E15: przypisanie pracownika do wybranych projektów.
-- Dodaje listę kluczy projektów, do których pracownik ma dostęp w interfejsie.
-- Pusta lista = brak ograniczenia (widzi wszystkie). Administrator zawsze widzi wszystkie.
-- Migracja nie zmienia ani nie usuwa danych projektów i uczestników.

alter table public.zespol
  add column if not exists projekty text[] not null default '{}';
