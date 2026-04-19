-- Pre-consulta dinámica: preguntas configurables por servicio + respuestas por cita.
ALTER TABLE "agenda_services" ADD COLUMN IF NOT EXISTS "preconsult_fields" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "preconsult_responses" jsonb;
