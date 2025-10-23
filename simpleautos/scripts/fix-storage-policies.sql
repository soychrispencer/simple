-- Corregir políticas RLS para storage buckets
-- Ejecutar en Supabase SQL Editor

-- Primero, eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own cover" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover" ON storage.objects;

DROP POLICY IF EXISTS "Vehicle images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload images for their own vehicles" ON storage.objects;
DROP POLICY IF EXISTS "Users can update images for their own vehicles" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete images for their own vehicles" ON storage.objects;

-- Políticas corregidas para AVATARES
-- SELECT público (las imágenes son visibles para todos)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- INSERT: Permitir a usuarios autenticados subir avatares
CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- UPDATE: Permitir a usuarios autenticados actualizar sus propios avatares
CREATE POLICY "Users can update avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- DELETE: Permitir a usuarios autenticados eliminar sus propios avatares
CREATE POLICY "Users can delete avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- Políticas corregidas para COVERS
CREATE POLICY "Cover images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Users can upload cover" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update cover" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete cover" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
  );

-- Políticas corregidas para VEHICLES
CREATE POLICY "Vehicle images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicles');

CREATE POLICY "Users can upload vehicle images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update vehicle images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete vehicle images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;