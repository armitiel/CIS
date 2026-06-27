-- E10: Wspólny dostęp zespołowy (tryb „zespół").
-- Cel: kilka kont (np. magi.jazdzewska@gmail.com i stow.pomost@gmail.com) widzi
-- i edytuje TE SAME dane projektu, mimo że dane mają różnych właścicieli (user_id).
--
-- Podejście BEZPIECZNE i NIENISZCZĄCE: nie usuwamy istniejących reguł
-- „właściciel = auth.uid()". Dodajemy DODATKOWE reguły (permissive są łączone
-- przez OR), które dają dostęp każdemu, czyj e-mail jest na liście public.zespol.
-- Dzięki temu: właściciel dalej widzi swoje, a członek zespołu widzi wszystko.
--
-- Wklej w Supabase: SQL Editor → New query → Run. Skrypt jest idempotentny.

------------------------------------------------------------------------------
-- 1) Lista członków zespołu (po e-mailu) + funkcja sprawdzająca
------------------------------------------------------------------------------
create table if not exists public.zespol (
  email text primary key,
  dodany timestamptz not null default now()
);

alter table public.zespol enable row level security;

drop policy if exists "zespol_select" on public.zespol;
create policy "zespol_select" on public.zespol
  for select to authenticated using (true);

-- SECURITY DEFINER: funkcja czyta public.zespol niezależnie od RLS.
create or replace function public.czy_w_zespole()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.zespol z
    where lower(z.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Członkowie zespołu (e-maile logowania Google). Dodaj kolejne wiersze w razie potrzeby.
insert into public.zespol (email) values
  ('magi.jazdzewska@gmail.com'),
  ('stow.pomost@gmail.com')
on conflict (email) do nothing;

------------------------------------------------------------------------------
-- 2) Dodatkowe reguły „zespół" na tabelach danych (DODAJEMY, nie usuwamy)
------------------------------------------------------------------------------
do $$
declare
  t text;
  tabele text[] := array[
    'uczestnicy','projekty','profil','obecnosci',
    'wpisy_sciezki','zajecia','kadra','grafik_kadry'
  ];
begin
  foreach t in array tabele loop
    execute format('drop policy if exists "%s_zespol_select" on public.%I', t, t);
    execute format(
      'create policy "%s_zespol_select" on public.%I for select to authenticated using (public.czy_w_zespole())', t, t);

    execute format('drop policy if exists "%s_zespol_insert" on public.%I', t, t);
    execute format(
      'create policy "%s_zespol_insert" on public.%I for insert to authenticated with check (public.czy_w_zespole())', t, t);

    execute format('drop policy if exists "%s_zespol_update" on public.%I', t, t);
    execute format(
      'create policy "%s_zespol_update" on public.%I for update to authenticated using (public.czy_w_zespole()) with check (public.czy_w_zespole())', t, t);

    execute format('drop policy if exists "%s_zespol_delete" on public.%I', t, t);
    execute format(
      'create policy "%s_zespol_delete" on public.%I for delete to authenticated using (public.czy_w_zespole())', t, t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 3) Wspólny dostęp do dokumentów (Storage, bucket „dokumenty-projektu")
------------------------------------------------------------------------------
drop policy if exists "dok_zespol_select" on storage.objects;
create policy "dok_zespol_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());

drop policy if exists "dok_zespol_insert" on storage.objects;
create policy "dok_zespol_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());

drop policy if exists "dok_zespol_update" on storage.objects;
create policy "dok_zespol_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole())
  with check (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());

drop policy if exists "dok_zespol_delete" on storage.objects;
create policy "dok_zespol_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());
