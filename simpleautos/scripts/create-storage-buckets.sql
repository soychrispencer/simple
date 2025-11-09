-- Crear buckets de storage y políticas RLS
-- Ejecutar en Supabase SQL Editor

-- Crear bucket para avatares (público para lectura, privado para escritura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Crear bucket para portadas (público para lectura, privado para escritura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Crear bucket para imágenes de vehículos (público para lectura, privado para escritura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicles',
  'vehicles',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para bucket 'avatars'
-- Permitir SELECT público (ya que bucket es público)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Permitir INSERT solo para usuarios autenticados
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir UPDATE solo para el propietario
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir DELETE solo para el propietario
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Políticas RLS para bucket 'covers'
CREATE POLICY "Cover images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Users can upload their own cover" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own cover" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own cover" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Políticas RLS para bucket 'vehicles'
CREATE POLICY "Vehicle images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicles');

CREATE POLICY "Users can upload images for their own vehicles" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update images for their own vehicles" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete images for their own vehicles" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicles'
    AND auth.role() = 'authenticated'
  );

-- Verificar que los buckets se crearon correctamente
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('avatars', 'covers', 'vehicles');