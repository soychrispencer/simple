CREATE TABLE IF NOT EXISTS "serenata_provider_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"coordinator_id" uuid,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"logo_url" text,
	"cover_url" text,
	"phone" varchar(40),
	"whatsapp" varchar(40),
	"region" varchar(120),
	"comuna_base" varchar(120),
	"service_comunas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"rating_average" numeric(4, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_provider_groups_slug_idx" ON "serenata_provider_groups" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_groups_owner_idx" ON "serenata_provider_groups" ("owner_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_groups_coordinator_idx" ON "serenata_provider_groups" ("coordinator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_groups_status_idx" ON "serenata_provider_groups" ("status");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_provider_groups" ADD CONSTRAINT "serenata_provider_groups_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_provider_groups" ADD CONSTRAINT "serenata_provider_groups_coordinator_id_serenata_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."serenata_coordinators"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serenata_group_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_group_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"musicians_count" integer DEFAULT 3 NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'CLP' NOT NULL,
	"event_type" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_group_services_provider_idx" ON "serenata_group_services" ("provider_group_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_group_services" ADD CONSTRAINT "serenata_group_services_provider_group_id_serenata_provider_groups_id_fk" FOREIGN KEY ("provider_group_id") REFERENCES "public"."serenata_provider_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "provider_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "selected_service_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenatas_provider_group_idx" ON "serenatas" ("provider_group_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_provider_group_id_serenata_provider_groups_id_fk" FOREIGN KEY ("provider_group_id") REFERENCES "public"."serenata_provider_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_selected_service_id_serenata_group_services_id_fk" FOREIGN KEY ("selected_service_id") REFERENCES "public"."serenata_group_services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
