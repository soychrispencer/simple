-- Fix para Instagram: Aplicar migración pendiente de agenda_professional_profiles
-- Ejecutar en la base de datos de producción para resolver el error de columna "encuadre"

-- Extender agenda_professional_profiles con campos faltantes
ALTER TABLE agenda_professional_profiles
  ADD COLUMN IF NOT EXISTS encuadre TEXT,
  ADD COLUMN IF NOT EXISTS requires_advance_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

-- Extender agenda_appointments con campos faltantes
ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS policy_agreed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_agreed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'not_required';

-- Verificar que las columnas se hayan creado correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('agenda_professional_profiles', 'agenda_appointments') 
  AND table_schema = current_schema()
ORDER BY table_name, ordinal_position;
