-- SimpleAgenda: audit events + notification events

CREATE TABLE IF NOT EXISTS "agenda_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid,
	"user_id" uuid,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(100),
	"action" varchar(60) NOT NULL,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"ip_address" varchar(60),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agenda_audit_events_professional_idx" ON "agenda_audit_events" ("professional_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_audit_events_created_at_idx" ON "agenda_audit_events" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_audit_events_entity_idx" ON "agenda_audit_events" ("entity_type", "entity_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agenda_notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid,
	"appointment_id" uuid,
	"client_id" uuid,
	"channel" varchar(20) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"recipient" varchar(255),
	"status" varchar(20) NOT NULL DEFAULT 'sent',
	"error_message" text,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agenda_notification_events_professional_idx" ON "agenda_notification_events" ("professional_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notification_events_appointment_idx" ON "agenda_notification_events" ("appointment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notification_events_created_at_idx" ON "agenda_notification_events" ("created_at");
