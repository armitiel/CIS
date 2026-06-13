-- E4: harmonogram zajęć (prywatny per użytkownik).
-- kolor: 'green' | 'blue' | 'amber'.

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
