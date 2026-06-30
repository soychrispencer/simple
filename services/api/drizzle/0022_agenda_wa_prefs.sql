-- WhatsApp notification preferences per professional
ALTER TABLE agenda_professional_profiles
  ADD COLUMN IF NOT EXISTS wa_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_notify_professional   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_professional_phone    VARCHAR(30);
