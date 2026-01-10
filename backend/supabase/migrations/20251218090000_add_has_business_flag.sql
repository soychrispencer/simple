-- Flag Mi Negocio en perfiles
-- Fecha: 18-12-2025
-- Objetivo: exponer has_business como feature flag derivado de public_profiles para acelerar panel/onboarding

-- 1) Columna con default seguro
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_business boolean NOT NULL DEFAULT false;

-- 2) Backfill inicial tomando perfiles con negocio activo
UPDATE public.profiles p
SET has_business = true
WHERE EXISTS (
  SELECT 1
  FROM public.public_profiles pp
  WHERE pp.owner_profile_id = p.id
    AND pp.status = 'active'
);

-- Nota: la sincronización en tiempo real (crear/suspender public_profile) se maneja en capa app/servicios.
