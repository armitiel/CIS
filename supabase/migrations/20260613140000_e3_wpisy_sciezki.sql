-- E3: wpisy kadry w ścieżce reintegracji (prywatne per użytkownik).
-- typ: 'diagnoza' | 'cel' | 'notatka' | 'spotkanie' | 'dokument' (dowolny tekst).

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
