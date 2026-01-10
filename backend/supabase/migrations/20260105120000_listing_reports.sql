/*
  Reportes de publicaciones (vehículos u otras verticales)
  - Inserción: usuarios autenticados
  - Lectura/gestión: staff
*/

CREATE TABLE IF NOT EXISTS public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_reports_status_check CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS listing_reports_listing_id_idx ON public.listing_reports (listing_id);
CREATE INDEX IF NOT EXISTS listing_reports_created_at_idx ON public.listing_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS listing_reports_status_idx ON public.listing_reports (status);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- Inserción solo por usuarios autenticados y atada al reporter_id (default auth.uid()).
DROP POLICY IF EXISTS "listing_reports_insert_authenticated" ON public.listing_reports;
CREATE POLICY "listing_reports_insert_authenticated"
  ON public.listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Lectura solo para staff.
DROP POLICY IF EXISTS "listing_reports_select_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_select_staff"
  ON public.listing_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  );

-- Gestión (update) solo para staff.
DROP POLICY IF EXISTS "listing_reports_update_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_update_staff"
  ON public.listing_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_staff = true
    )
  );
