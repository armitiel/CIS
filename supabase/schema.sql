-- Schemat bazy CIS — etap E1. Wklej w Supabase: SQL Editor → New query → Run.
-- Model PRYWATNY per użytkownik: każda zalogowana osoba ma własny, odseparowany
-- zestaw projektów i uczestników (RLS po auth.uid() = user_id).
-- Przykładowe projekty są zaszczepiane aplikacyjnie przy pierwszym logowaniu
-- (patrz: profil.zasiano) i można je usunąć.
--
-- Skrypt jest idempotentny — można go uruchomić ponownie po wcześniejszej wersji.

------------------------------------------------------------------------------
-- 1) UCZESTNICY (struktura SOWA EFS) — prywatni per użytkownik
------------------------------------------------------------------------------
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

-- Właściciel rekordu (uzupełniany automatycznie przez DEFAULT przy insert).
alter table public.uczestnicy
  add column if not exists user_id uuid not null default auth.uid();

create index if not exists uczestnicy_projekt_idx
  on public.uczestnicy (projekt_id);
create index if not exists uczestnicy_user_idx
  on public.uczestnicy (user_id);

alter table public.uczestnicy enable row level security;

-- Stare polityki „dowolny zalogowany" — usuwamy i zastępujemy prywatnymi.
drop policy if exists "kadra_select" on public.uczestnicy;
drop policy if exists "kadra_insert" on public.uczestnicy;
drop policy if exists "kadra_update" on public.uczestnicy;
drop policy if exists "kadra_delete" on public.uczestnicy;

drop policy if exists "uczestnicy_wlasciciel_select" on public.uczestnicy;
create policy "uczestnicy_wlasciciel_select" on public.uczestnicy
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "uczestnicy_wlasciciel_insert" on public.uczestnicy;
create policy "uczestnicy_wlasciciel_insert" on public.uczestnicy
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "uczestnicy_wlasciciel_update" on public.uczestnicy;
create policy "uczestnicy_wlasciciel_update" on public.uczestnicy
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "uczestnicy_wlasciciel_delete" on public.uczestnicy;
create policy "uczestnicy_wlasciciel_delete" on public.uczestnicy
  for delete to authenticated using (auth.uid() = user_id);

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

------------------------------------------------------------------------------
-- 2) PROJEKTY — prywatne per użytkownik
--    klucz = logiczny identyfikator używany w aplikacji (np. cis-2026),
--    szablon = 'cis' | 'swa' | NULL (NULL → katalog generyczny z sekcji).
------------------------------------------------------------------------------
create table if not exists public.projekty (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  klucz text not null,
  nazwa text not null default '',
  skrot text not null default '',
  nabor text not null default '',
  wnioskodawca text not null default '',
  okres text not null default '',
  zrodlo text not null default '',
  sekcje text[] not null default '{}',
  szablon text,
  utworzono date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, klucz)
);

create index if not exists projekty_user_idx on public.projekty (user_id);

alter table public.projekty enable row level security;

drop policy if exists "projekty_wlasciciel_select" on public.projekty;
create policy "projekty_wlasciciel_select" on public.projekty
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "projekty_wlasciciel_insert" on public.projekty;
create policy "projekty_wlasciciel_insert" on public.projekty
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "projekty_wlasciciel_update" on public.projekty;
create policy "projekty_wlasciciel_update" on public.projekty
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projekty_wlasciciel_delete" on public.projekty;
create policy "projekty_wlasciciel_delete" on public.projekty
  for delete to authenticated using (auth.uid() = user_id);

------------------------------------------------------------------------------
-- 3) PROFIL — znacznik, że przykładowe projekty zostały już zaszczepione.
--    Dzięki temu usunięte przykłady NIE wracają po ponownym logowaniu.
------------------------------------------------------------------------------
create table if not exists public.profil (
  user_id uuid primary key default auth.uid(),
  zasiano boolean not null default false,
  utworzono timestamptz not null default now()
);

alter table public.profil enable row level security;

drop policy if exists "profil_wlasciciel_select" on public.profil;
create policy "profil_wlasciciel_select" on public.profil
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profil_wlasciciel_insert" on public.profil;
create policy "profil_wlasciciel_insert" on public.profil
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profil_wlasciciel_update" on public.profil;
create policy "profil_wlasciciel_update" on public.profil
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------------------------
-- 4) OBECNOŚCI (etap E2) — prywatne per użytkownik.
--    Jeden wpis = znak obecności uczestnika danego dnia roboczego.
--    znak: 'p' obecny · 'u' usprawiedliwiony · 'a' nieobecny nieuspr.
------------------------------------------------------------------------------
create table if not exists public.obecnosci (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  projekt_id text not null,
  uczestnik_id text not null,
  data date not null,
  znak text not null check (znak in ('p', 'u', 'a')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, projekt_id, uczestnik_id, data)
);

create index if not exists obecnosci_projekt_idx
  on public.obecnosci (user_id, projekt_id);
create index if not exists obecnosci_data_idx
  on public.obecnosci (user_id, projekt_id, data);

alter table public.obecnosci enable row level security;

drop policy if exists "obecnosci_wlasciciel_select" on public.obecnosci;
create policy "obecnosci_wlasciciel_select" on public.obecnosci
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "obecnosci_wlasciciel_insert" on public.obecnosci;
create policy "obecnosci_wlasciciel_insert" on public.obecnosci
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "obecnosci_wlasciciel_update" on public.obecnosci;
create policy "obecnosci_wlasciciel_update" on public.obecnosci
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "obecnosci_wlasciciel_delete" on public.obecnosci;
create policy "obecnosci_wlasciciel_delete" on public.obecnosci
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists obecnosci_touch_trg on public.obecnosci;
create trigger obecnosci_touch_trg
  before update on public.obecnosci
  for each row execute function public.uczestnicy_touch();

------------------------------------------------------------------------------
-- 5) WPISY ŚCIEŻKI (etap E3) — dziennik kadry w ścieżce reintegracji.
--    typ: diagnoza | cel | notatka | spotkanie | dokument (dowolny tekst).
------------------------------------------------------------------------------
create table if not exists public.wpisy_sciezki (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  projekt_id text not null,
  uczestnik_id text not null,
  data date not null default current_date,
  typ text not null default 'notatka',
  tresc text not null default '',
  autor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wpisy_sciezki_uczestnik_idx
  on public.wpisy_sciezki (user_id, projekt_id, uczestnik_id);

alter table public.wpisy_sciezki enable row level security;

drop policy if exists "wpisy_sciezki_wlasciciel_select" on public.wpisy_sciezki;
create policy "wpisy_sciezki_wlasciciel_select" on public.wpisy_sciezki
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "wpisy_sciezki_wlasciciel_insert" on public.wpisy_sciezki;
create policy "wpisy_sciezki_wlasciciel_insert" on public.wpisy_sciezki
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "wpisy_sciezki_wlasciciel_update" on public.wpisy_sciezki;
create policy "wpisy_sciezki_wlasciciel_update" on public.wpisy_sciezki
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wpisy_sciezki_wlasciciel_delete" on public.wpisy_sciezki;
create policy "wpisy_sciezki_wlasciciel_delete" on public.wpisy_sciezki
  for delete to authenticated using (auth.uid() = user_id);

------------------------------------------------------------------------------
-- 6) ZAJĘCIA (etap E4) — harmonogram realizacji wsparcia.
--    kolor: green | blue | amber.
------------------------------------------------------------------------------
create table if not exists public.zajecia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  projekt_id text not null,
  data date not null,
  godzina text not null default '',
  godzina_do text not null default '',
  nazwa text not null default '',
  typ text not null default '',
  prowadzacy text not null default '',
  grupa text not null default '',
  kolor text not null default 'green',
  osob int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists zajecia_projekt_data_idx
  on public.zajecia (user_id, projekt_id, data);

alter table public.zajecia enable row level security;

drop policy if exists "zajecia_wlasciciel_select" on public.zajecia;
create policy "zajecia_wlasciciel_select" on public.zajecia
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "zajecia_wlasciciel_insert" on public.zajecia;
create policy "zajecia_wlasciciel_insert" on public.zajecia
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "zajecia_wlasciciel_update" on public.zajecia;
create policy "zajecia_wlasciciel_update" on public.zajecia
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "zajecia_wlasciciel_delete" on public.zajecia;
create policy "zajecia_wlasciciel_delete" on public.zajecia
  for delete to authenticated using (auth.uid() = user_id);
