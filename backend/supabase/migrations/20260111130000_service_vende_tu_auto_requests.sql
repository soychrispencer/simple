/*
  Servicio: Vende tu auto con SimpleAutos (consignación / venta asistida)
  - Guarda solicitudes de dueños que quieren que SimpleAutos gestione la venta.
  - RLS habilitado sin policies: sólo Service Role (o DB admins) pueden leer/escribir.
*/

CREATE TABLE IF NOT EXISTS public.vehicle_sale_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'web',

  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid NULL REFERENCES public.listings(id) ON DELETE SET NULL,

  owner_name text NULL,
  owner_email text NULL,
  owner_phone text NULL,
  owner_city text NULL,

  vehicle_type text NULL,
  vehicle_brand text NULL,
  vehicle_model text NULL,
  vehicle_year int NULL,
  vehicle_mileage_km int NULL,
  desired_price numeric(12,2) NULL,

  notes text NULL,

  ip text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.vehicle_sale_service_requests ENABLE ROW LEVEL SECURITY;

-- No policies on purpose (service-role only).

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_created_at
  ON public.vehicle_sale_service_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_status
  ON public.vehicle_sale_service_requests (status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_update_vehicle_sale_service_requests_updated_at'
  ) THEN
    -- already exists
    NULL;
  ELSE
    CREATE TRIGGER trg_update_vehicle_sale_service_requests_updated_at
    BEFORE UPDATE ON public.vehicle_sale_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;
