-- Remove the discontinued SimpleSerenatas vertical.
-- The application no longer exposes serenatas routes or schema; this migration
-- cleans up databases that previously received the experimental tables.

DROP VIEW IF EXISTS "serenata_captain_profiles" CASCADE;
DROP VIEW IF EXISTS "serenata_musician_profiles" CASCADE;

UPDATE "users"
SET "primary_vertical" = NULL
WHERE "primary_vertical" = 'serenatas';

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_primary_vertical_check";
ALTER TABLE "users"
ADD CONSTRAINT "users_primary_vertical_check"
CHECK ("primary_vertical" IS NULL OR "primary_vertical" IN ('autos','propiedades','agenda'));

DROP TABLE IF EXISTS "serenata_coordinator_preapprovals" CASCADE;
DROP TABLE IF EXISTS "serenata_mp_webhook_events" CASCADE;
DROP TABLE IF EXISTS "serenata_messages" CASCADE;
DROP TABLE IF EXISTS "serenata_availability" CASCADE;
DROP TABLE IF EXISTS "serenata_coordinator_reviews" CASCADE;
DROP TABLE IF EXISTS "serenata_commissions" CASCADE;
DROP TABLE IF EXISTS "serenata_payments" CASCADE;
DROP TABLE IF EXISTS "serenata_subscription_payments" CASCADE;
DROP TABLE IF EXISTS "serenata_subscriptions" CASCADE;
DROP TABLE IF EXISTS "serenata_musician_lineup" CASCADE;
DROP TABLE IF EXISTS "serenatas" CASCADE;
DROP TABLE IF EXISTS "serenata_coordinator_crew_memberships" CASCADE;
DROP TABLE IF EXISTS "serenata_coordinator_profiles" CASCADE;
DROP TABLE IF EXISTS "serenata_notifications" CASCADE;
DROP TABLE IF EXISTS "serenata_reviews" CASCADE;
DROP TABLE IF EXISTS "serenata_availability_slots" CASCADE;
DROP TABLE IF EXISTS "serenata_routes" CASCADE;
DROP TABLE IF EXISTS "serenata_assignments" CASCADE;
DROP TABLE IF EXISTS "serenata_group_members" CASCADE;
DROP TABLE IF EXISTS "serenata_groups" CASCADE;
DROP TABLE IF EXISTS "serenata_requests" CASCADE;
DROP TABLE IF EXISTS "serenata_coordinators" CASCADE;
DROP TABLE IF EXISTS "serenata_musicians" CASCADE;
