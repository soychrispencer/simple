CREATE TABLE IF NOT EXISTS "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(80) NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"business_id" uuid NOT NULL,
	"person_kind" varchar(40),
	"person_id" varchar(80),
	"subject_kind" varchar(60) NOT NULL,
	"subject_id" varchar(80) NOT NULL,
	"actor" varchar(40) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timeline_events_business_person_occurred_idx"
	ON "timeline_events" ("business_id", "person_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timeline_events_business_subject_idx"
	ON "timeline_events" ("business_id", "subject_kind", "subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timeline_events_business_occurred_idx"
	ON "timeline_events" ("business_id", "occurred_at");
