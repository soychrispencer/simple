-- SimpleAgenda: sesiones grupales (talleres, clases, grupos)

CREATE TABLE IF NOT EXISTS agenda_group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES agenda_services(id) ON DELETE SET NULL,
  title varchar(200) NOT NULL,
  description text,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  duration_minutes integer NOT NULL,
  capacity integer NOT NULL,
  price decimal(10,2),
  currency varchar(10) NOT NULL DEFAULT 'CLP',
  modality varchar(20) NOT NULL DEFAULT 'presential', -- 'online' | 'presential'
  location text,
  meeting_url text,
  status varchar(20) NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  is_public boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_group_sessions_professional_idx
  ON agenda_group_sessions(professional_id);
CREATE INDEX IF NOT EXISTS agenda_group_sessions_starts_at_idx
  ON agenda_group_sessions(starts_at);
CREATE INDEX IF NOT EXISTS agenda_group_sessions_status_idx
  ON agenda_group_sessions(status);

-- Asistentes / inscripciones a una sesión grupal
CREATE TABLE IF NOT EXISTS agenda_group_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES agenda_group_sessions(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES agenda_clients(id) ON DELETE SET NULL,
  client_name varchar(200) NOT NULL,
  client_email varchar(200),
  client_phone varchar(40),
  status varchar(20) NOT NULL DEFAULT 'registered', -- 'registered' | 'attended' | 'no_show' | 'cancelled'
  price_paid decimal(10,2),
  paid_at timestamp,
  notes text,
  registered_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_group_attendees_session_idx
  ON agenda_group_attendees(session_id);
CREATE INDEX IF NOT EXISTS agenda_group_attendees_professional_idx
  ON agenda_group_attendees(professional_id);
CREATE INDEX IF NOT EXISTS agenda_group_attendees_client_idx
  ON agenda_group_attendees(client_id);
