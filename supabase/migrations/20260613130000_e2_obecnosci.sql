-- E2: rejestr obecności (prywatny per użytkownik).
-- znak: 'p' obecny · 'u' usprawiedliwiony · 'a' nieobecny nieusprawiedliwiony.

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

-- funkcja uczestnicy_touch() istnieje z migracji E1; przy samodzielnym
-- uruchomieniu tej migracji utwórz ją w razie potrzeby.
create or replace function public.uczestnicy_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists obecnosci_touch_trg on public.obecnosci;
create trigger obecnosci_touch_trg
  before update on public.obecnosci
  for each row execute function public.uczestnicy_touch();
