-- E9: grafik kadry + automatyczne karty czasu pracy (prywatne per użytkownik).
-- Dwie tabele:
--   kadra         — osoby zatrudnione w CIS (lista do klikania zamiast wpisywania),
--   grafik_kadry  — kto/kiedy pracuje: godziny od-do, typ (grupowe|indywidualne).
-- Z grafiku generowane są miesięczne karty czasu pracy (wzór G-02).

-- ====== KADRA (osoby zatrudnione) ======
create table if not exists public.kadra (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  projekt_id text not null,
  imie text not null default '',
  nazwisko text not null default '',
  stanowisko text not null default '',
  wymiar text not null default '',
  godzina_od text not null default '08:00',
  godzina_do text not null default '16:00',
  typ_domyslny text not null default 'grupowe',
  aktywny boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists kadra_projekt_idx
  on public.kadra (user_id, projekt_id);

alter table public.kadra enable row level security;

drop policy if exists "kadra_wlasciciel_select" on public.kadra;
create policy "kadra_wlasciciel_select" on public.kadra
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "kadra_wlasciciel_insert" on public.kadra;
create policy "kadra_wlasciciel_insert" on public.kadra
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "kadra_wlasciciel_update" on public.kadra;
create policy "kadra_wlasciciel_update" on public.kadra
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kadra_wlasciciel_delete" on public.kadra;
create policy "kadra_wlasciciel_delete" on public.kadra
  for delete to authenticated using (auth.uid() = user_id);

-- ====== GRAFIK KADRY (kto/kiedy/godziny/typ) ======
create table if not exists public.grafik_kadry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  projekt_id text not null,
  kadra_id text not null,
  data date not null,
  godzina_od text not null default '',
  godzina_do text not null default '',
  typ text not null default 'grupowe',
  zadanie text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists grafik_kadry_projekt_data_idx
  on public.grafik_kadry (user_id, projekt_id, data);
create index if not exists grafik_kadry_osoba_idx
  on public.grafik_kadry (user_id, projekt_id, kadra_id);

alter table public.grafik_kadry enable row level security;

drop policy if exists "grafik_wlasciciel_select" on public.grafik_kadry;
create policy "grafik_wlasciciel_select" on public.grafik_kadry
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "grafik_wlasciciel_insert" on public.grafik_kadry;
create policy "grafik_wlasciciel_insert" on public.grafik_kadry
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "grafik_wlasciciel_update" on public.grafik_kadry;
create policy "grafik_wlasciciel_update" on public.grafik_kadry
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "grafik_wlasciciel_delete" on public.grafik_kadry;
create policy "grafik_wlasciciel_delete" on public.grafik_kadry
  for delete to authenticated using (auth.uid() = user_id);
