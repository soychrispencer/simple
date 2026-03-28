-- SimpleAgenda tables migration

CREATE TABLE "agenda_professional_profiles" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agenda_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 50 NOT NULL,
	"price" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'CLP' NOT NULL,
	"is_online" boolean DEFAULT true NOT NULL,
	"is_presential" boolean DEFAULT false NOT NULL,
	"color" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agenda_availability_rules" (
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

CREATE TABLE "agenda_blocked_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agenda_clients" (
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
	"internal_notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agenda_appointments" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agenda_session_notes" (
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

CREATE TABLE "agenda_payments" (
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

-- Foreign keys
ALTER TABLE "agenda_professional_profiles" ADD CONSTRAINT "agenda_professional_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_services" ADD CONSTRAINT "agenda_services_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_availability_rules" ADD CONSTRAINT "agenda_availability_rules_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_blocked_slots" ADD CONSTRAINT "agenda_blocked_slots_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_clients" ADD CONSTRAINT "agenda_clients_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."agenda_services"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_appointments" ADD CONSTRAINT "agenda_appointments_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."agenda_appointments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_session_notes" ADD CONSTRAINT "agenda_session_notes_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."agenda_professional_profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."agenda_appointments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agenda_payments" ADD CONSTRAINT "agenda_payments_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agenda_clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Unique indexes
CREATE UNIQUE INDEX "agenda_profiles_slug_idx" ON "agenda_professional_profiles" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_profiles_user_id_idx" ON "agenda_professional_profiles" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_notes_appointment_idx" ON "agenda_session_notes" USING btree ("appointment_id");
--> statement-breakpoint

-- Performance indexes
CREATE INDEX "agenda_services_professional_idx" ON "agenda_services" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_availability_professional_idx" ON "agenda_availability_rules" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_blocked_slots_professional_idx" ON "agenda_blocked_slots" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_clients_professional_idx" ON "agenda_clients" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_appointments_professional_idx" ON "agenda_appointments" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_appointments_starts_at_idx" ON "agenda_appointments" USING btree ("starts_at");
--> statement-breakpoint
CREATE INDEX "agenda_appointments_client_idx" ON "agenda_appointments" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "agenda_notes_professional_idx" ON "agenda_session_notes" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_payments_professional_idx" ON "agenda_payments" USING btree ("professional_id");
--> statement-breakpoint
CREATE INDEX "agenda_payments_appointment_idx" ON "agenda_payments" USING btree ("appointment_id");
