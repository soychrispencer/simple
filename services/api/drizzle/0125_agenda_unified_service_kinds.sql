-- Unifica sesiones grupales dentro de agenda_services (kind = group_event).

ALTER TABLE agenda_services
  ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'appointment',
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS starts_at timestamp,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS session_status varchar(20);

INSERT INTO agenda_services (
  id, professional_id, name, description, duration_minutes, price, currency,
  is_online, is_presential, is_active, position, kind, capacity, starts_at,
  location, meeting_url, session_status, created_at, updated_at
)
SELECT
  gs.id,
  gs.professional_id,
  gs.title,
  gs.description,
  gs.duration_minutes,
  gs.price,
  gs.currency,
  CASE WHEN gs.modality = 'online' THEN true ELSE false END,
  CASE WHEN gs.modality = 'presential' THEN true ELSE false END,
  true,
  0,
  'group_event',
  gs.capacity,
  gs.starts_at,
  gs.location,
  gs.meeting_url,
  gs.status,
  gs.created_at,
  gs.updated_at
FROM agenda_group_sessions gs
ON CONFLICT (id) DO NOTHING;

ALTER TABLE agenda_group_attendees DROP CONSTRAINT IF EXISTS agenda_group_attendees_session_id_agenda_group_sessions_id_fk;

ALTER TABLE agenda_group_attendees
  ADD CONSTRAINT agenda_group_attendees_service_id_fk
  FOREIGN KEY (session_id) REFERENCES agenda_services(id) ON DELETE CASCADE;

DROP TABLE IF EXISTS agenda_group_sessions;
