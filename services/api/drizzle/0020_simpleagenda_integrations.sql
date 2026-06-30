-- Migration: Add encuadre, pago anticipado, Google Calendar fields

-- Extend agenda_professional_profiles with new fields
ALTER TABLE agenda_professional_profiles
  ADD COLUMN IF NOT EXISTS encuadre TEXT,
  ADD COLUMN IF NOT EXISTS requires_advance_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;

-- Extend agenda_appointments with policy agreement + google event tracking + payment status
ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS policy_agreed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS policy_agreed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'not_required';
-- payment_status: 'not_required' | 'pending' | 'paid' | 'refunded'

-- Change default session duration to 60 min (affects future rows only)
ALTER TABLE agenda_services
  ALTER COLUMN duration_minutes SET DEFAULT 60;
