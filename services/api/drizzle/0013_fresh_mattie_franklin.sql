CREATE TABLE "public_profile_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"name" varchar(160) NOT NULL,
	"role_title" varchar(120),
	"bio" text,
	"email" varchar(255),
	"phone" varchar(40),
	"whatsapp" varchar(40),
	"avatar_image_url" varchar(500),
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_lead_contact" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_profile_team_members" ADD CONSTRAINT "public_profile_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;