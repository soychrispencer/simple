CREATE TABLE IF NOT EXISTS "address_book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(20) DEFAULT 'personal' NOT NULL,
	"label" varchar(100) NOT NULL,
	"country_code" varchar(3) DEFAULT 'CL' NOT NULL,
	"region_id" varchar(50),
	"region_name" varchar(120),
	"commune_id" varchar(50),
	"commune_name" varchar(120),
	"neighborhood" varchar(120),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"postal_code" varchar(20),
	"arrival_instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"geo_point" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid,
	"client_id" uuid,
	"client_name" varchar(160),
	"client_email" varchar(255),
	"client_phone" varchar(30),
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"modality" varchar(20) DEFAULT 'online' NOT NULL,
	"meeting_url" varchar(500),
	"location" varchar(255),
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"internal_notes" text,
	"client_notes" text,
	"cancelled_at" timestamp,
	"cancelled_by" varchar(20),
	"cancellation_reason" text,
	"reminder_sent_at" timestamp,
	"reminder_30min_sent_at" timestamp,
	"policy_agreed" boolean DEFAULT false NOT NULL,
	"policy_agreed_at" timestamp,
	"google_event_id" varchar(255),
	"payment_status" varchar(20) DEFAULT 'not_required' NOT NULL,
	"series_id" uuid,
	"recurrence_frequency" varchar(20),
	"preconsult_responses" jsonb,
	"promotion_id" uuid,
	"promotion_code" varchar(40),
	"original_price" numeric(10, 2),
	"discount_amount" numeric(10, 2),
	"client_pack_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid,
	"user_id" uuid,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(100),
	"action" varchar(60) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(60),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"break_start" varchar(5),
	"break_end" varchar(5),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_blocked_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_client_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(120),
	"size_bytes" integer,
	"kind" varchar(20) DEFAULT 'document' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_client_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"pack_id" uuid,
	"client_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"sessions_total" integer NOT NULL,
	"sessions_used" integer DEFAULT 0 NOT NULL,
	"price_paid" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applies_to" varchar(10) DEFAULT 'all' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_client_tag_assignments" (
	"client_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_client_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(20),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(30),
	"whatsapp" varchar(30),
	"rut" varchar(20),
	"date_of_birth" varchar(10),
	"gender" varchar(20),
	"occupation" varchar(100),
	"address" varchar(255),
	"city" varchar(100),
	"emergency_contact_name" varchar(160),
	"emergency_contact_phone" varchar(30),
	"referred_by" varchar(160),
	"referred_by_client_id" uuid,
	"internal_notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_group_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid,
	"client_name" varchar(200) NOT NULL,
	"client_email" varchar(200),
	"client_phone" varchar(40),
	"status" varchar(20) DEFAULT 'registered' NOT NULL,
	"price_paid" numeric(10, 2),
	"paid_at" timestamp,
	"notes" text,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_group_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"modality" varchar(20) DEFAULT 'presential' NOT NULL,
	"location" text,
	"meeting_url" text,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"address_line" varchar(255) NOT NULL,
	"city" varchar(100),
	"region" varchar(100),
	"notes" text,
	"google_maps_url" varchar(500),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid,
	"appointment_id" uuid,
	"client_id" uuid,
	"channel" varchar(20) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"recipient" varchar(255),
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_nps_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"client_id" uuid,
	"token" varchar(64) NOT NULL,
	"score" integer,
	"comment" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_nps_responses_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"sessions_count" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applies_to" varchar(10) DEFAULT 'all' NOT NULL,
	"validity_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"appointment_id" uuid,
	"client_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"method" varchar(30),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"external_id" varchar(255),
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_professional_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"profession" varchar(100),
	"display_name" varchar(160),
	"headline" varchar(255),
	"bio" text,
	"avatar_url" varchar(500),
	"cover_url" varchar(500),
	"public_email" varchar(255),
	"public_phone" varchar(30),
	"public_whatsapp" varchar(30),
	"city" varchar(100),
	"region" varchar(100),
	"address" varchar(255),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/Santiago' NOT NULL,
	"booking_window_days" integer DEFAULT 30 NOT NULL,
	"cancellation_hours" integer DEFAULT 24 NOT NULL,
	"confirmation_mode" varchar(20) DEFAULT 'auto' NOT NULL,
	"allows_recurrent_booking" boolean DEFAULT true NOT NULL,
	"encuadre" text,
	"requires_advance_payment" boolean DEFAULT false NOT NULL,
	"advance_payment_instructions" text,
	"wa_notifications_enabled" boolean DEFAULT true NOT NULL,
	"wa_notify_professional" boolean DEFAULT true NOT NULL,
	"wa_professional_phone" varchar(30),
	"google_calendar_id" varchar(255),
	"google_access_token" text,
	"google_refresh_token" text,
	"google_token_expiry" timestamp,
	"mp_access_token" text,
	"mp_public_key" varchar(255),
	"mp_user_id" varchar(100),
	"mp_refresh_token" text,
	"accepts_transfer" boolean DEFAULT false NOT NULL,
	"accepts_mp" boolean DEFAULT false NOT NULL,
	"accepts_payment_link" boolean DEFAULT false NOT NULL,
	"payment_link_url" varchar(500),
	"bank_transfer_data" jsonb,
	"website_url" varchar(500),
	"instagram_url" varchar(500),
	"facebook_url" varchar(500),
	"linkedin_url" varchar(500),
	"tiktok_url" varchar(500),
	"youtube_url" varchar(500),
	"twitter_url" varchar(500),
	"notifications_last_seen_at" timestamp,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"code" varchar(40),
	"label" varchar(120) NOT NULL,
	"description" text,
	"discount_type" varchar(10) DEFAULT 'percent' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"applies_to" varchar(10) DEFAULT 'all' NOT NULL,
	"service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_amount" numeric(10, 2),
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"referrer_client_id" uuid NOT NULL,
	"referee_client_id" uuid,
	"referee_name" varchar(200),
	"referee_phone" varchar(40),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reward_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"converted_at" timestamp,
	"rewarded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"is_online" boolean DEFAULT true NOT NULL,
	"is_presential" boolean DEFAULT false NOT NULL,
	"color" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"preconsult_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_session_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"client_id" uuid,
	"content" text NOT NULL,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"vertical" varchar(20) NOT NULL,
	"kind" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"provider" varchar(30) DEFAULT 'mercadopago' NOT NULL,
	"provider_order_id" varchar(255),
	"provider_status" varchar(50),
	"provider_response" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"return_url" text,
	"webhook_url" text,
	"paid_at" timestamp,
	"refunded_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"plan_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"price_monthly" numeric(10, 2) NOT NULL,
	"price_yearly" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"max_listings" integer DEFAULT 0 NOT NULL,
	"max_featured_listings" integer DEFAULT 0 NOT NULL,
	"max_images_per_listing" integer DEFAULT 0 NOT NULL,
	"analytics_enabled" boolean DEFAULT false NOT NULL,
	"crm_enabled" boolean DEFAULT false NOT NULL,
	"priority_support" boolean DEFAULT false NOT NULL,
	"custom_branding" boolean DEFAULT false NOT NULL,
	"api_access" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"provider" varchar(30) DEFAULT 'mercadopago' NOT NULL,
	"provider_subscription_id" varchar(255),
	"provider_status" varchar(50),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ============================================================
-- Patch: add columns that non-journal migrations (0029-0037)
-- would have added to EXISTING tables via ALTER TABLE.
-- CREATE TABLE IF NOT EXISTS above is a no-op for these tables.
-- ============================================================

-- agenda_professional_profiles: columns from 0029_payment_toggles + misc
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "allows_recurrent_booking" boolean NOT NULL DEFAULT true;
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "accepts_transfer" boolean NOT NULL DEFAULT false;
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "accepts_mp" boolean NOT NULL DEFAULT false;
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "accepts_payment_link" boolean NOT NULL DEFAULT false;
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "notifications_last_seen_at" timestamp;
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "plan" varchar(20) NOT NULL DEFAULT 'free';
ALTER TABLE "agenda_professional_profiles" ADD COLUMN IF NOT EXISTS "plan_expires_at" timestamp;
--> statement-breakpoint

-- agenda_services: column from 0032_preconsult
ALTER TABLE "agenda_services" ADD COLUMN IF NOT EXISTS "preconsult_fields" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- agenda_appointments: columns from 0032_preconsult, 0035_promotions, 0036_packs, + recurrence
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "series_id" uuid;
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "recurrence_frequency" varchar(20);
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "preconsult_responses" jsonb;
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "promotion_id" uuid;
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "promotion_code" varchar(40);
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "original_price" numeric(10, 2);
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2);
ALTER TABLE "agenda_appointments" ADD COLUMN IF NOT EXISTS "client_pack_id" uuid;
--> statement-breakpoint

-- agenda_clients: column from 0034_referrals
ALTER TABLE "agenda_clients" ADD COLUMN IF NOT EXISTS "referred_by_client_id" uuid;
--> statement-breakpoint

-- ============================================================
-- End patch
-- ============================================================

ALTER TABLE "instagram_accounts" ALTER COLUMN "profile_picture_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "instagram_publications" ALTER COLUMN "instagram_permalink" SET DATA TYPE text;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "address_book" ADD CONSTRAINT "address_book_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_service_id_agenda_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."agenda_services"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_availability_rules" ADD CONSTRAINT "agenda_availability_rules_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_blocked_slots" ADD CONSTRAINT "agenda_blocked_slots_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_attachments" ADD CONSTRAINT "agenda_client_attachments_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_attachments" ADD CONSTRAINT "agenda_client_attachments_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_packs" ADD CONSTRAINT "agenda_client_packs_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_packs" ADD CONSTRAINT "agenda_client_packs_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_tag_assignments" ADD CONSTRAINT "agenda_client_tag_assignments_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_client_tag_assignments" ADD CONSTRAINT "agenda_client_tag_assignments_tag_id_agenda_client_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."agenda_client_tags"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_clients" ADD CONSTRAINT "agenda_clients_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_group_attendees" ADD CONSTRAINT "agenda_group_attendees_session_id_agenda_group_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agenda_group_sessions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_group_attendees" ADD CONSTRAINT "agenda_group_attendees_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_group_sessions" ADD CONSTRAINT "agenda_group_sessions_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_locations" ADD CONSTRAINT "agenda_locations_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_nps_responses" ADD CONSTRAINT "agenda_nps_responses_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_nps_responses" ADD CONSTRAINT "agenda_nps_responses_appointment_id_agenda_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."agenda_appointments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_nps_responses" ADD CONSTRAINT "agenda_nps_responses_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_packs" ADD CONSTRAINT "agenda_packs_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_appointment_id_agenda_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."agenda_appointments"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_professional_profiles" ADD CONSTRAINT "agenda_professional_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_promotions" ADD CONSTRAINT "agenda_promotions_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_referrals" ADD CONSTRAINT "agenda_referrals_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_referrals" ADD CONSTRAINT "agenda_referrals_referrer_client_id_agenda_clients_id_fk" FOREIGN KEY ("referrer_client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_referrals" ADD CONSTRAINT "agenda_referrals_referee_client_id_agenda_clients_id_fk" FOREIGN KEY ("referee_client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_services" ADD CONSTRAINT "agenda_services_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_appointment_id_agenda_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."agenda_appointments"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_professional_id_agenda_professional_profiles_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_client_id_agenda_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action; EXCEPTION WHEN others THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "address_book_user_id_idx" ON "address_book" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_professional_idx" ON "agenda_appointments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_starts_at_idx" ON "agenda_appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_client_idx" ON "agenda_appointments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_series_idx" ON "agenda_appointments" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_promotion_idx" ON "agenda_appointments" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_appointments_client_pack_idx" ON "agenda_appointments" USING btree ("client_pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_audit_events_professional_idx" ON "agenda_audit_events" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_audit_events_created_at_idx" ON "agenda_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_audit_events_entity_idx" ON "agenda_audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_availability_professional_idx" ON "agenda_availability_rules" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_blocked_slots_professional_idx" ON "agenda_blocked_slots" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_attachments_client_idx" ON "agenda_client_attachments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_attachments_professional_idx" ON "agenda_client_attachments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_packs_professional_idx" ON "agenda_client_packs" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_packs_client_idx" ON "agenda_client_packs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_packs_status_idx" ON "agenda_client_packs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_tag_assignments_tag_idx" ON "agenda_client_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_client_tags_professional_idx" ON "agenda_client_tags" USING btree ("professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_client_tags_unique_name_idx" ON "agenda_client_tags" USING btree ("professional_id",lower("name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_clients_professional_idx" ON "agenda_clients" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_attendees_session_idx" ON "agenda_group_attendees" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_attendees_professional_idx" ON "agenda_group_attendees" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_attendees_client_idx" ON "agenda_group_attendees" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_sessions_professional_idx" ON "agenda_group_sessions" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_sessions_starts_at_idx" ON "agenda_group_sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_group_sessions_status_idx" ON "agenda_group_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_locations_professional_idx" ON "agenda_locations" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notification_events_professional_idx" ON "agenda_notification_events" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notification_events_appointment_idx" ON "agenda_notification_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notification_events_created_at_idx" ON "agenda_notification_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_nps_appointment_idx" ON "agenda_nps_responses" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_nps_professional_idx" ON "agenda_nps_responses" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_nps_submitted_idx" ON "agenda_nps_responses" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_packs_professional_idx" ON "agenda_packs" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_payments_professional_idx" ON "agenda_payments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_payments_appointment_idx" ON "agenda_payments" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_profiles_slug_idx" ON "agenda_professional_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_profiles_user_id_idx" ON "agenda_professional_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_promotions_professional_idx" ON "agenda_promotions" USING btree ("professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_promotions_code_unique_idx" ON "agenda_promotions" USING btree ("professional_id",lower("code"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_referrals_professional_idx" ON "agenda_referrals" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_referrals_referrer_idx" ON "agenda_referrals" USING btree ("referrer_client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_referrals_status_idx" ON "agenda_referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_services_professional_idx" ON "agenda_services" USING btree ("professional_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_notes_appointment_idx" ON "agenda_session_notes" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_notes_professional_idx" ON "agenda_session_notes" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_user_idx" ON "payment_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_subscription_idx" ON "payment_orders" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_provider_idx" ON "payment_orders" USING btree ("provider_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_status_idx" ON "payment_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_kind_idx" ON "payment_orders" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_orders_vertical_idx" ON "payment_orders" USING btree ("vertical");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_vertical_plan_idx" ON "subscription_plans" USING btree ("vertical","plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_plans_vertical_idx" ON "subscription_plans" USING btree ("vertical");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_vertical_idx" ON "subscriptions" USING btree ("user_id","vertical");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_vertical_idx" ON "subscriptions" USING btree ("vertical");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_provider_idx" ON "subscriptions" USING btree ("provider_subscription_id");
