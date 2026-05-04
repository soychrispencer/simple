-- Serenatas: tablas coordinador / serenatas / pagos / lineup / reseñas (naming unificado)

CREATE TABLE IF NOT EXISTS "serenata_coordinator_profiles" (
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

CREATE INDEX IF NOT EXISTS "coordinator_profiles_user_idx" ON "serenata_coordinator_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "coordinator_profiles_plan_idx" ON "serenata_coordinator_profiles"("subscription_plan");
CREATE INDEX IF NOT EXISTS "coordinator_profiles_location_idx" ON "serenata_coordinator_profiles"("city", "region");
CREATE INDEX IF NOT EXISTS "coordinator_profiles_verified_idx" ON "serenata_coordinator_profiles"("is_verified");
CREATE INDEX IF NOT EXISTS "coordinator_profiles_rating_idx" ON "serenata_coordinator_profiles"("rating");

CREATE TABLE IF NOT EXISTS "serenatas" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "client_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "client_name" varchar(255) NOT NULL,
    "client_phone" varchar(50),
    "client_email" varchar(255),
    "coordinator_profile_id" uuid REFERENCES "serenata_coordinator_profiles"("id"),
    "event_type" varchar(50) NOT NULL DEFAULT 'serenata',
    "event_date" date NOT NULL,
    "event_time" time NOT NULL,
    "duration" integer DEFAULT 30,
    "address" text NOT NULL,
    "city" varchar(100),
    "region" varchar(100),
    "latitude" numeric(10, 8),
    "longitude" numeric(11, 8),
    "recipient_name" varchar(255),
    "recipient_relation" varchar(50),
    "message" text,
    "song_requests" varchar(255)[],
    "price" integer,
    "commission" integer DEFAULT 0,
    "coordinator_earnings" integer,
    "status" varchar(30) NOT NULL DEFAULT 'pending',
    "source" varchar(30) NOT NULL DEFAULT 'self_captured',
    "quoted_at" timestamp,
    "accepted_at" timestamp,
    "confirmed_at" timestamp,
    "completed_at" timestamp,
    "cancelled_at" timestamp,
    "coordinator_arrived_at" timestamp,
    "coordinator_departed_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenatas_client_idx" ON "serenatas"("client_id");
CREATE INDEX IF NOT EXISTS "serenatas_coordinator_profile_idx" ON "serenatas"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "serenatas_status_idx" ON "serenatas"("status");
CREATE INDEX IF NOT EXISTS "serenatas_date_idx" ON "serenatas"("event_date");
CREATE INDEX IF NOT EXISTS "serenatas_location_idx" ON "serenatas"("city", "region");
CREATE INDEX IF NOT EXISTS "serenatas_source_idx" ON "serenatas"("source");

CREATE TABLE IF NOT EXISTS "serenata_musician_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "coordinator_profile_id" uuid NOT NULL REFERENCES "serenata_coordinator_profiles"("id") ON DELETE CASCADE,
    "instruments" varchar(255)[],
    "bio" text,
    "phone" varchar(50),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "musician_profiles_user_idx" ON "serenata_musician_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "musician_profiles_coordinator_profile_idx" ON "serenata_musician_profiles"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "musician_profiles_active_idx" ON "serenata_musician_profiles"("is_active");

CREATE TABLE IF NOT EXISTS "serenata_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "coordinator_profile_id" uuid NOT NULL REFERENCES "serenata_coordinator_profiles"("id") ON DELETE CASCADE,
    "plan" varchar(20) NOT NULL,
    "price_monthly" integer,
    "currency" varchar(3) DEFAULT 'CLP',
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "started_at" timestamp NOT NULL DEFAULT now(),
    "ends_at" timestamp,
    "cancelled_at" timestamp,
    "external_subscription_id" varchar(255),
    "external_customer_id" varchar(255),
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subscriptions_coordinator_profile_idx" ON "serenata_subscriptions"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "serenata_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_external_idx" ON "serenata_subscriptions"("external_subscription_id");

CREATE TABLE IF NOT EXISTS "serenata_subscription_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "subscription_id" uuid NOT NULL REFERENCES "serenata_subscriptions"("id") ON DELETE CASCADE,
    "coordinator_profile_id" uuid NOT NULL REFERENCES "serenata_coordinator_profiles"("id") ON DELETE CASCADE,
    "amount" integer NOT NULL,
    "currency" varchar(3) DEFAULT 'CLP',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "period_start" timestamp NOT NULL,
    "period_end" timestamp NOT NULL,
    "external_payment_id" varchar(255),
    "receipt_url" text,
    "paid_at" timestamp,
    "failed_at" timestamp,
    "refunded_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "sub_payments_subscription_idx" ON "serenata_subscription_payments"("subscription_id");
CREATE INDEX IF NOT EXISTS "sub_payments_coordinator_profile_idx" ON "serenata_subscription_payments"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "sub_payments_status_idx" ON "serenata_subscription_payments"("status");

CREATE TABLE IF NOT EXISTS "serenata_availability" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "coordinator_profile_id" uuid NOT NULL REFERENCES "serenata_coordinator_profiles"("id") ON DELETE CASCADE,
    "day_of_week" integer NOT NULL,
    "start_time" time NOT NULL,
    "end_time" time NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "availability_coordinator_profile_idx" ON "serenata_availability"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "availability_day_idx" ON "serenata_availability"("day_of_week");

CREATE TABLE IF NOT EXISTS "serenata_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "serenata_id" uuid NOT NULL REFERENCES "serenatas"("id") ON DELETE CASCADE,
    "client_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "coordinator_profile_id" uuid NOT NULL REFERENCES "serenata_coordinator_profiles"("id"),
    "total_amount" integer NOT NULL,
    "platform_commission" integer NOT NULL DEFAULT 0,
    "commission_vat" integer NOT NULL DEFAULT 0,
    "coordinator_earnings" integer NOT NULL,
    "currency" varchar(3) DEFAULT 'CLP',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "external_payment_id" varchar(255),
    "external_transfer_id" varchar(255),
    "client_paid_at" timestamp,
    "released_to_coordinator_at" timestamp,
    "refunded_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_payments_serenata_idx" ON "serenata_payments"("serenata_id");
CREATE INDEX IF NOT EXISTS "serenata_payments_client_idx" ON "serenata_payments"("client_id");
CREATE INDEX IF NOT EXISTS "serenata_payments_coordinator_profile_idx" ON "serenata_payments"("coordinator_profile_id");
CREATE INDEX IF NOT EXISTS "serenata_payments_status_idx" ON "serenata_payments"("status");

CREATE TABLE IF NOT EXISTS "serenata_musician_lineup" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "serenata_id" uuid NOT NULL REFERENCES "serenatas"("id") ON DELETE CASCADE,
    "musician_id" uuid NOT NULL REFERENCES "serenata_musician_profiles"("id") ON DELETE CASCADE,
    "confirmed_at" timestamp,
    "attended" boolean,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "musician_lineup_serenata_idx" ON "serenata_musician_lineup"("serenata_id");
CREATE INDEX IF NOT EXISTS "musician_lineup_musician_idx" ON "serenata_musician_lineup"("musician_id");

CREATE TABLE IF NOT EXISTS "serenata_coordinator_reviews" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "serenata_id" uuid NOT NULL REFERENCES "serenatas"("id") ON DELETE CASCADE,
    "reviewer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "reviewer_type" varchar(20) NOT NULL,
    "reviewee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "reviewee_type" varchar(20) NOT NULL,
    "rating" integer NOT NULL,
    "punctuality_rating" integer,
    "performance_rating" integer,
    "communication_rating" integer,
    "comment" text,
    "response" text,
    "responded_at" timestamp,
    "is_visible" boolean NOT NULL DEFAULT true,
    "moderated_at" timestamp,
    "moderated_by" uuid REFERENCES "users"("id"),
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "coordinator_reviews_serenata_idx" ON "serenata_coordinator_reviews"("serenata_id");
CREATE INDEX IF NOT EXISTS "coordinator_reviews_reviewer_idx" ON "serenata_coordinator_reviews"("reviewer_id");
CREATE INDEX IF NOT EXISTS "coordinator_reviews_reviewee_idx" ON "serenata_coordinator_reviews"("reviewee_id");
CREATE INDEX IF NOT EXISTS "coordinator_reviews_rating_idx" ON "serenata_coordinator_reviews"("rating");

CREATE TABLE IF NOT EXISTS "serenata_notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "type" varchar(30) NOT NULL,
    "serenata_id" uuid REFERENCES "serenata_requests"("id"),
    "group_id" uuid REFERENCES "serenata_groups"("id"),
    "is_read" boolean NOT NULL DEFAULT false,
    "read_at" timestamp,
    "push_sent" boolean NOT NULL DEFAULT false,
    "push_sent_at" timestamp,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "serenata_notifications_user_idx" ON "serenata_notifications"("user_id");
CREATE INDEX IF NOT EXISTS "serenata_notifications_unread_idx" ON "serenata_notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "serenata_notifications_type_idx" ON "serenata_notifications"("type");
CREATE INDEX IF NOT EXISTS "serenata_notifications_created_idx" ON "serenata_notifications"("created_at");
