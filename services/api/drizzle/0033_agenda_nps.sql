-- NPS: encuesta post-cita. token único por respuesta, un envío por cita.
CREATE TABLE IF NOT EXISTS "agenda_nps_responses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "professional_id" uuid NOT NULL REFERENCES "agenda_professional_profiles"("id"),
    "appointment_id" uuid NOT NULL REFERENCES "agenda_appointments"("id") ON DELETE CASCADE,
    "client_id" uuid REFERENCES "agenda_clients"("id"),
    "token" varchar(64) NOT NULL UNIQUE,
    "score" integer,
    "comment" text,
    "sent_at" timestamp NOT NULL DEFAULT now(),
    "submitted_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "agenda_nps_appointment_idx" ON "agenda_nps_responses"("appointment_id");
CREATE INDEX IF NOT EXISTS "agenda_nps_professional_idx" ON "agenda_nps_responses"("professional_id");
CREATE INDEX IF NOT EXISTS "agenda_nps_submitted_idx" ON "agenda_nps_responses"("submitted_at");
