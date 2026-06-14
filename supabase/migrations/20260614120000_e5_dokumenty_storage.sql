------------------------------------------------------------------------------
-- E5: Współdzielone dokumenty projektu (Supabase Storage)
--
-- Prywatny bucket „dokumenty-projektu". Pliki układane w ścieżce
--   {user_id}/{projekt_id}/{nazwa_pliku}
-- dzięki czemu RLS na storage.objects ogranicza dostęp do własnych plików
-- (pierwszy segment ścieżki = auth.uid()). Spójne z modelem prywatnym E1.
------------------------------------------------------------------------------

-- 1) Bucket (prywatny — pliki dostępne tylko przez API z sesją użytkownika)
insert into storage.buckets (id, name, public)
values ('dokumenty-projektu', 'dokumenty-projektu', false)
on conflict (id) do nothing;

-- 2) Polityki RLS na storage.objects — wyłącznie własny folder użytkownika
drop policy if exists "dok_projektu_select" on storage.objects;
create policy "dok_projektu_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dokumenty-projektu'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dok_projektu_insert" on storage.objects;
create policy "dok_projektu_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dokumenty-projektu'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dok_projektu_update" on storage.objects;
create policy "dok_projektu_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dokumenty-projektu'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'dokumenty-projektu'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dok_projektu_delete" on storage.objects;
create policy "dok_projektu_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dokumenty-projektu'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
