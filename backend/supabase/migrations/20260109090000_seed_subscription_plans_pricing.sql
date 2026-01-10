-- Seed/update subscription plans (Chile market pricing)
-- Keeps plan_key stable; safe to re-run.

INSERT INTO public.subscription_plans (
  plan_key,
  name,
  description,
  target_type,
  limits,
  features,
  price_monthly,
  currency,
  is_active
) VALUES
  (
    'pro',
    'Pro',
    'Publica más, activa tu página pública y accede a estadísticas.',
    'both',
    '{"max_active_listings": 10}'::jsonb,
    '["Hasta 10 publicaciones activas","Activa tu página pública","Estadísticas"]'::jsonb,
    9990,
    'CLP',
    true
  ),
  (
    'business',
    'Empresa',
    'Próximamente disponible: pensado para equipos y operación multi-sucursal.',
    'both',
    '{"max_active_listings": -1}'::jsonb,
    '["Próximamente: multiusuario (equipo)","Próximamente: branding avanzado","Próximamente: integraciones reales"]'::jsonb,
    39990,
    'CLP',
    false
  )
ON CONFLICT (plan_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  target_type = EXCLUDED.target_type,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  price_monthly = EXCLUDED.price_monthly,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  updated_at = now();
