CREATE TABLE "service_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"vertical" varchar(20) NOT NULL,
	"service_type" varchar(40) NOT NULL,
	"plan_id" varchar(20) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(40) NOT NULL,
	"contact_whatsapp" varchar(40),
	"location_label" varchar(255),
	"asset_type" varchar(120),
	"asset_brand" varchar(120),
	"asset_model" varchar(120),
	"asset_year" varchar(20),
	"asset_mileage" varchar(80),
	"asset_area" varchar(80),
	"expected_price" varchar(80),
	"notes" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"source_page" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_leads" ADD CONSTRAINT "service_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;