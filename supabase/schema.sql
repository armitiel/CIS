-- Schemat bazy CIS — etap E1. Wklej w Supabase: SQL Editor → New query → Run.
-- Tabela uczestników (struktura SOWA EFS). Projekty pozostają w kodzie aplikacji
-- (rejestr projektów), więc tu trzymamy tylko ich identyfikator (projekt_id).

create table if not exists public.uczestnicy (
  id uuid primary key default gen_random_uuid(),
  projekt_id text not null,
  imie text not null default '',
  nazwisko text not null default '',
  kategoria text not null default 'bezrobotny',      -- 'bezrobotny' | 'bierny'
  sciezka text not null default 'IPZS',              -- 'IPZS' | 'IPR'
  cykl int not null default 1,
  grupa text not null default '—',
  status text not null default 'aktywny',            -- aktywny|rezerwowy|zakończył|przerwał
  data_przystapienia text not null default '—',
  frekwencja int not null default 0,
  posiadane_dokumenty text[] not null default '{}',
  etap_sciezki int not null default 0,
  postep_sciezki int not null default 0,
  sowa jsonb not null default '{}'::jsonb,            -- pełne dane SOWA (pesel, adres, ISCED…)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uczestnicy_projekt_idx
  on public.uczestnicy (projekt_id);

-- Włącz Row Level Security
alter table public.uczestnicy enable row level security;

-- Dostęp wyłącznie dla zalogowanej kadry (dowolny zalogowany użytkownik).
-- Jeśli w przyszłości potrzebny podział na role/organizacje — zawęzić tutaj.
drop policy if exists "kadra_select" on public.uczestnicy;
create policy "kadra_select" on public.uczestnicy
  for select to authenticated using (true);

drop policy if exists "kadra_insert" on public.uczestnicy;
create policy "kadra_insert" on public.uczestnicy
  for insert to authenticated with check (true);

drop policy if exists "kadra_update" on public.uczestnicy;
create policy "kadra_update" on public.uczestnicy
  for update to authenticated using (true) with check (true);

drop policy if exists "kadra_delete" on public.uczestnicy;
create policy "kadra_delete" on public.uczestnicy
  for delete to authenticated using (true);

-- Automatyczna aktualizacja updated_at
create or replace function public.uczestnicy_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists uczestnicy_touch_trg on public.uczestnicy;
create trigger uczestnicy_touch_trg
  before update on public.uczestnicy
  for each row execute function public.uczestnicy_touch();
