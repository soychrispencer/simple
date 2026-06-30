CREATE TABLE "service_lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "next_task_title" varchar(255);--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "next_task_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_lead_activities" ADD CONSTRAINT "service_lead_activities_lead_id_service_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."service_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_lead_activities" ADD CONSTRAINT "service_lead_activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_leads" ADD CONSTRAINT "service_leads_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;