CREATE TABLE "crm_pipeline_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"scope" varchar(20) DEFAULT 'listing' NOT NULL,
	"name" varchar(80) NOT NULL,
	"status" varchar(20) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_leads" ADD COLUMN "pipeline_column_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_pipeline_columns" ADD CONSTRAINT "crm_pipeline_columns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_leads" ADD CONSTRAINT "listing_leads_pipeline_column_id_crm_pipeline_columns_id_fk" FOREIGN KEY ("pipeline_column_id") REFERENCES "public"."crm_pipeline_columns"("id") ON DELETE no action ON UPDATE no action;