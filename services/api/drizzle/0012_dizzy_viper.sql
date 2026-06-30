CREATE TABLE "public_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"account_kind" varchar(20) DEFAULT 'individual' NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"headline" varchar(180),
	"bio" text,
	"company_name" varchar(160),
	"website" varchar(500),
	"public_email" varchar(255),
	"public_phone" varchar(40),
	"public_whatsapp" varchar(40),
	"address_line" varchar(255),
	"city" varchar(120),
	"region" varchar(120),
	"cover_image_url" varchar(500),
	"avatar_image_url" varchar(500),
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"business_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule_note" varchar(255),
	"always_open" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_profiles" ADD CONSTRAINT "public_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "public_profiles_user_vertical_idx" ON "public_profiles" USING btree ("user_id","vertical");--> statement-breakpoint
CREATE UNIQUE INDEX "public_profiles_vertical_slug_idx" ON "public_profiles" USING btree ("vertical","slug");