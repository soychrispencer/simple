-- Add timezone field to users table
ALTER TABLE "users" ADD COLUMN "timezone" varchar(50) NOT NULL DEFAULT 'America/Santiago';
