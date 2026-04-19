-- SimpleAgenda: tags reutilizables para clientes

CREATE TABLE IF NOT EXISTS "agenda_client_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(20),
	"position" integer NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agenda_client_tags_professional_idx" ON "agenda_client_tags" ("professional_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_client_tags_unique_name_idx" ON "agenda_client_tags" ("professional_id", lower("name"));
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agenda_client_tag_assignments" (
	"client_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	PRIMARY KEY ("client_id", "tag_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agenda_client_tag_assignments_tag_idx" ON "agenda_client_tag_assignments" ("tag_id");
