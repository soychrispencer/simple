-- CORRECCIÓN DE POLÍTICAS RLS PARA TABLA PROFILES
-- Fecha: 2025-10-21
-- Problema: Las políticas RLS estaban usando 'id' en lugar de 'user_id'
-- Esto impedía que los usuarios crearan sus propios perfiles

-- Eliminar políticas incorrectas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow null user_id for anonymous profiles" ON public.profiles;

-- Crear políticas correctas usando user_id (que referencia auth.users.id)
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE USING (auth.uid() = user_id);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;