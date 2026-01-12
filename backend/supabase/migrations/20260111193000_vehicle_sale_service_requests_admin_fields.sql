/*
  Add operational fields for Venta Asistida service requests
  - reference_code: short code to share with customer
  - admin_notes: internal notes
  - contacted_at: when first contact was made
*/

ALTER TABLE public.vehicle_sale_service_requests
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_sale_service_requests_reference_code
  ON public.vehicle_sale_service_requests (reference_code)
  WHERE reference_code IS NOT NULL;
