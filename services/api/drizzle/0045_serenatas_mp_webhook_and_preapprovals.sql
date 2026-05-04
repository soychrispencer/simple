CREATE TABLE "serenata_coordinator_preapprovals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_profile_id" uuid NOT NULL,
	"external_id" varchar(120) NOT NULL,
	"plan" varchar(20) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'CLP' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payer_email" varchar(255),
	"started_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_mp_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" varchar(60),
	"resource_id" varchar(120),
	"external_reference" varchar(255),
	"status" varchar(30) DEFAULT 'received' NOT NULL,
	"headers" jsonb,
	"payload" jsonb,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "serenata_coordinator_preapprovals" ADD CONSTRAINT "serenata_coordinator_preapprovals_coordinator_profile_id_serenata_coordinator_profiles_id_fk" FOREIGN KEY ("coordinator_profile_id") REFERENCES "public"."serenata_coordinator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coord_preapproval_external_idx" ON "serenata_coordinator_preapprovals" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "coord_preapproval_coord_idx" ON "serenata_coordinator_preapprovals" USING btree ("coordinator_profile_id");--> statement-breakpoint
CREATE INDEX "coord_preapproval_status_idx" ON "serenata_coordinator_preapprovals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "serenata_mp_webhook_resource_idx" ON "serenata_mp_webhook_events" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "serenata_mp_webhook_status_idx" ON "serenata_mp_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "serenata_mp_webhook_created_idx" ON "serenata_mp_webhook_events" USING btree ("created_at");