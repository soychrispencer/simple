-- Migration: Tablas de Serenatas - Capitanes y Perfiles
-- Created: 2026-04-25

-- ==========================================
-- Perfiles de Capitanes
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_captain_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "bio" text,
    "phone" varchar(50),
    "experience" integer,
    "subscription_plan" varchar(20) NOT NULL DEFAULT 'free',
    "subscription_status" varchar(20) NOT NULL DEFAULT 'active',
    "subscription_started_at" timestamp,
    "subscription_ends_at" timestamp,
    "city" varchar(100),
    "region" varchar(100),
    "latitude" numeric(10, 8),
    "longitude" numeric(11, 8),
    "service_radius" integer DEFAULT 50,
    "min_price" integer DEFAULT 100,
    "max_price" integer DEFAULT 500,
    "is_verified" boolean NOT NULL DEFAULT false,
    "verified_at" timestamp,
    "total_serenatas" integer NOT NULL DEFAULT 0,
    "rating" numeric(2, 1) NOT NULL DEFAULT '5.0',
    "reviews_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Indexes for captain profiles
CREATE INDEX IF NOT EXISTS "captain_profiles_user_idx" ON "serenata_captain_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "captain_profiles_plan_idx" ON "serenata_captain_profiles"("subscription_plan");
CREATE INDEX IF NOT EXISTS "captain_profiles_location_idx" ON "serenata_captain_profiles"("city", "region");
CREATE INDEX IF NOT EXISTS "captain_profiles_verified_idx" ON "serenata_captain_profiles"("is_verified");
CREATE INDEX IF NOT EXISTS "captain_profiles_rating_idx" ON "serenata_captain_profiles"("rating");

-- ==========================================
-- Perfiles de Músicos (miembros de cuadrilla)
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_musician_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "captain_id" uuid NOT NULL REFERENCES "serenata_captain_profiles"("id") ON DELETE CASCADE,
    "instruments" varchar(255)[],
    "bio" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "musician_profiles_user_idx" ON "serenata_musician_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "musician_profiles_captain_idx" ON "serenata_musician_profiles"("captain_id");

-- ==========================================
-- Suscripciones de capitanes
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "captain_id" uuid NOT NULL REFERENCES "serenata_captain_profiles"("id") ON DELETE CASCADE,
    "plan" varchar(20) NOT NULL,
    "price_monthly" integer NOT NULL DEFAULT 0,
    "currency" varchar(3) DEFAULT 'CLP',
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "starts_at" timestamp NOT NULL DEFAULT now(),
    "ends_at" timestamp,
    "cancelled_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_subscriptions_captain_idx" ON "serenata_subscriptions"("captain_id");

-- ==========================================
-- Pagos de suscripciones
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_subscription_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "subscription_id" uuid NOT NULL REFERENCES "serenata_subscriptions"("id") ON DELETE CASCADE,
    "captain_id" uuid NOT NULL REFERENCES "serenata_captain_profiles"("id") ON DELETE CASCADE,
    "amount" integer NOT NULL,
    "currency" varchar(3) DEFAULT 'CLP',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "payment_method" varchar(50),
    "payment_provider" varchar(50),
    "external_reference" varchar(255),
    "paid_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_payments_subscription_idx" ON "serenata_subscription_payments"("subscription_id");
CREATE INDEX IF NOT EXISTS "serenata_payments_captain_idx" ON "serenata_subscription_payments"("captain_id");

-- ==========================================
-- Disponibilidad de capitanes
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_availability" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "captain_id" uuid NOT NULL REFERENCES "serenata_captain_profiles"("id") ON DELETE CASCADE,
    "day_of_week" integer NOT NULL,
    "start_time" varchar(5) NOT NULL,
    "end_time" varchar(5) NOT NULL,
    "is_available" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_availability_captain_idx" ON "serenata_availability"("captain_id");

-- ==========================================
-- Pagos de serenatas (completar tabla)
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "serenata_id" uuid NOT NULL,
    "client_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "captain_id" uuid NOT NULL REFERENCES "serenata_captain_profiles"("id"),
    "total_amount" integer NOT NULL,
    "platform_commission" integer NOT NULL DEFAULT 0,
    "captain_earnings" integer NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "payment_method" varchar(50),
    "paid_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_payments_serenata_idx" ON "serenata_payments"("serenata_id");

-- ==========================================
-- Notificaciones de serenatas
-- ==========================================
CREATE TABLE IF NOT EXISTS "serenata_notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "data" jsonb,
    "is_read" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_notifications_user_idx" ON "serenata_notifications"("user_id");
CREATE INDEX IF NOT EXISTS "serenata_notifications_read_idx" ON "serenata_notifications"("is_read");
