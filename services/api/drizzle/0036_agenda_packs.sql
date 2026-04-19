-- SimpleAgenda: packs / bonos de sesiones

-- Definición de paquetes que vende el profesional
CREATE TABLE IF NOT EXISTS agenda_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  description text,
  sessions_count integer NOT NULL,
  price decimal(10,2) NOT NULL,
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to varchar(10) NOT NULL DEFAULT 'all', -- 'all' | 'services'
  validity_days integer,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_packs_professional_idx
  ON agenda_packs(professional_id);

-- Paquete comprado por un cliente (con saldo)
CREATE TABLE IF NOT EXISTS agenda_client_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
  pack_id uuid REFERENCES agenda_packs(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES agenda_clients(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  sessions_total integer NOT NULL,
  sessions_used integer NOT NULL DEFAULT 0,
  price_paid decimal(10,2),
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to varchar(10) NOT NULL DEFAULT 'all',
  purchased_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp,
  status varchar(20) NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'completed' | 'refunded'
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_client_packs_professional_idx
  ON agenda_client_packs(professional_id);
CREATE INDEX IF NOT EXISTS agenda_client_packs_client_idx
  ON agenda_client_packs(client_id);
CREATE INDEX IF NOT EXISTS agenda_client_packs_status_idx
  ON agenda_client_packs(status);

-- Vincular cita a un pack para descontar una sesión
ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS client_pack_id uuid REFERENCES agenda_client_packs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agenda_appointments_client_pack_idx
  ON agenda_appointments(client_pack_id);
