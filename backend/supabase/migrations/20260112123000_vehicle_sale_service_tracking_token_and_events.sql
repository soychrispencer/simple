/*
  Venta asistida: mejoras de seguimiento y auditoría
  - tracking_token: token no adivinable para seguimiento sin email
  - vehicle_sale_service_request_events: historial de cambios (admin / sistema)

  Nota:
  - RLS habilitado sin policies (service-role only), consistente con la tabla principal.
*/

ALTER TABLE public.vehicle_sale_service_requests
  ADD COLUMN IF NOT EXISTS tracking_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_tracking_token
  ON public.vehicle_sale_service_requests (tracking_token)
  WHERE tracking_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vehicle_sale_service_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  request_id uuid NOT NULL REFERENCES public.vehicle_sale_service_requests(id) ON DELETE CASCADE,

  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NULL,

  event_type text NOT NULL,
  from_status text NULL,
  to_status text NULL,

  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.vehicle_sale_service_request_events ENABLE ROW LEVEL SECURITY;

-- No policies on purpose (service-role only).

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_request_events_request_id_created_at
  ON public.vehicle_sale_service_request_events (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_sale_service_request_events_created_at
  ON public.vehicle_sale_service_request_events (created_at DESC);
