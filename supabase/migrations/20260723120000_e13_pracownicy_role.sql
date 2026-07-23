-- E13: zamknieta lista pracownikow, role i rzeczywiscie wspolna baza.
-- Migracja nie zmienia ani nie usuwa danych projektow i uczestnikow.

alter table public.zespol
  add column if not exists rola text not null default 'pracownik',
  add column if not exists aktywny boolean not null default true,
  add column if not exists nazwa text,
  add column if not exists dodany_przez uuid;

update public.zespol set email = lower(trim(email));
update public.zespol set rola = 'administrator'
where lower(email) in ('magi.jazdzewska@gmail.com', 'stow.pomost@gmail.com');

alter table public.zespol drop constraint if exists zespol_rola_check;
alter table public.zespol add constraint zespol_rola_check
  check (rola in ('administrator', 'pracownik'));
create unique index if not exists zespol_email_lower_idx on public.zespol (lower(email));

create or replace function public.zespol_normalizuj_email()
returns trigger language plpgsql set search_path = public as $$
begin
  new.email = lower(trim(new.email));
  if new.dodany_przez is null then new.dodany_przez = auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists zespol_normalizuj_email_trg on public.zespol;
create trigger zespol_normalizuj_email_trg before insert or update of email on public.zespol
  for each row execute function public.zespol_normalizuj_email();

create or replace function public.czy_w_zespole()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.zespol z
    where lower(z.email) = lower(coalesce(auth.jwt() ->> 'email', '')) and z.aktywny
  );
$$;
create or replace function public.czy_administratorem()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.zespol z
    where lower(z.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and z.aktywny and z.rola = 'administrator'
  );
$$;
revoke all on function public.czy_w_zespole() from public;
revoke all on function public.czy_administratorem() from public;
grant execute on function public.czy_w_zespole() to authenticated;
grant execute on function public.czy_administratorem() to authenticated;

create or replace function public.zespol_chron_ostatniego_admina()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.rola = 'administrator' and old.aktywny
     and (tg_op = 'DELETE' or new.rola <> 'administrator' or not new.aktywny)
     and not exists (
       select 1 from public.zespol z
       where lower(z.email) <> lower(old.email) and z.rola = 'administrator' and z.aktywny
     ) then
    raise exception 'Nie mozna wylaczyc ostatniego administratora.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists zespol_chron_ostatniego_admina_trg on public.zespol;
create trigger zespol_chron_ostatniego_admina_trg before update or delete on public.zespol
  for each row execute function public.zespol_chron_ostatniego_admina();

drop policy if exists "zespol_select" on public.zespol;
drop policy if exists "zespol_insert" on public.zespol;
drop policy if exists "zespol_update" on public.zespol;
drop policy if exists "zespol_delete" on public.zespol;
create policy "zespol_select" on public.zespol for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) or public.czy_administratorem());
create policy "zespol_insert" on public.zespol for insert to authenticated
  with check (public.czy_administratorem());
create policy "zespol_update" on public.zespol for update to authenticated
  using (public.czy_administratorem()) with check (public.czy_administratorem());
create policy "zespol_delete" on public.zespol for delete to authenticated
  using (public.czy_administratorem());

-- Dane wspolne: dostep ma tylko aktywny pracownik z listy.
do $$
declare
  t text;
  tabele text[] := array[
    'uczestnicy','projekty','obecnosci','wpisy_sciezki','zajecia','kadra','grafik_kadry'
  ];
begin
  foreach t in array tabele loop
    execute format('drop policy if exists "%s_wlasciciel_select" on public.%s', t, t);
    execute format('drop policy if exists "%s_wlasciciel_insert" on public.%s', t, t);
    execute format('drop policy if exists "%s_wlasciciel_update" on public.%s', t, t);
    execute format('drop policy if exists "%s_wlasciciel_delete" on public.%s', t, t);
    execute format('drop policy if exists "%s_zespol_select" on public.%s', t, t);
    execute format('drop policy if exists "%s_zespol_insert" on public.%s', t, t);
    execute format('drop policy if exists "%s_zespol_update" on public.%s', t, t);
    execute format('drop policy if exists "%s_zespol_delete" on public.%s', t, t);
    execute format('create policy "%s_zespol_select" on public.%s for select to authenticated using (public.czy_w_zespole())', t, t);
    execute format('create policy "%s_zespol_insert" on public.%s for insert to authenticated with check (public.czy_w_zespole())', t, t);
    execute format('create policy "%s_zespol_update" on public.%s for update to authenticated using (public.czy_w_zespole()) with check (public.czy_w_zespole())', t, t);
    execute format('create policy "%s_zespol_delete" on public.%s for delete to authenticated using (public.czy_w_zespole())', t, t);
  end loop;
end $$;

-- Profil pozostaje prywatny dla pracownika.
drop policy if exists "profil_zespol_select" on public.profil;
drop policy if exists "profil_zespol_insert" on public.profil;
drop policy if exists "profil_zespol_update" on public.profil;
drop policy if exists "profil_zespol_delete" on public.profil;
drop policy if exists "profil_wlasciciel_select" on public.profil;
drop policy if exists "profil_wlasciciel_insert" on public.profil;
drop policy if exists "profil_wlasciciel_update" on public.profil;
create policy "profil_wlasciciel_select" on public.profil for select to authenticated
  using (auth.uid() = user_id and public.czy_w_zespole());
create policy "profil_wlasciciel_insert" on public.profil for insert to authenticated
  with check (auth.uid() = user_id and public.czy_w_zespole());
create policy "profil_wlasciciel_update" on public.profil for update to authenticated
  using (auth.uid() = user_id and public.czy_w_zespole())
  with check (auth.uid() = user_id and public.czy_w_zespole());

-- Dokumenty projektu sa wspolne dla aktywnego zespolu.
drop policy if exists "dok_projektu_select" on storage.objects;
drop policy if exists "dok_projektu_insert" on storage.objects;
drop policy if exists "dok_projektu_update" on storage.objects;
drop policy if exists "dok_projektu_delete" on storage.objects;
drop policy if exists "dok_zespol_select" on storage.objects;
drop policy if exists "dok_zespol_insert" on storage.objects;
drop policy if exists "dok_zespol_update" on storage.objects;
drop policy if exists "dok_zespol_delete" on storage.objects;
create policy "dok_zespol_select" on storage.objects for select to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());
create policy "dok_zespol_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());
create policy "dok_zespol_update" on storage.objects for update to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole())
  with check (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());
create policy "dok_zespol_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'dokumenty-projektu' and public.czy_w_zespole());
