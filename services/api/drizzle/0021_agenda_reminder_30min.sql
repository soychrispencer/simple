-- Add 30-minute reminder tracking column to agenda_appointments
ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS reminder_30min_sent_at TIMESTAMP;
