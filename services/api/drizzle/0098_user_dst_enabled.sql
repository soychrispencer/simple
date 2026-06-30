-- dst_enabled queda en esquema por compatibilidad; IANA ya maneja horario de verano.
ALTER TABLE users ADD COLUMN IF NOT EXISTS dst_enabled BOOLEAN NOT NULL DEFAULT false;
