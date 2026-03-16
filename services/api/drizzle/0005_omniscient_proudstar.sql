CREATE TABLE "ad_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"name" varchar(120) NOT NULL,
	"format" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"destination_type" varchar(20) NOT NULL,
	"destination_url" text,
	"listing_href" varchar(500),
	"profile_slug" varchar(255),
	"desktop_image_data_url" text NOT NULL,
	"mobile_image_data_url" text,
	"overlay_enabled" boolean DEFAULT false NOT NULL,
	"overlay_title" varchar(160),
	"overlay_subtitle" text,
	"overlay_cta" varchar(80),
	"overlay_align" varchar(20) DEFAULT 'left' NOT NULL,
	"placement_section" varchar(20),
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"duration_days" integer NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;