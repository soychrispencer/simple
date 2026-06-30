-- Add primary_vertical column to users for vertical-scoped admin access.
-- NULL = platform-wide (superadmin sees everything).
-- 'autos' | 'propiedades' | 'agenda' = vertical-scoped admin.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_vertical" varchar(20);

-- Optional CHECK to keep the domain tight; nullable allowed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_primary_vertical_check'
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_primary_vertical_check"
        CHECK ("primary_vertical" IS NULL OR "primary_vertical" IN ('autos','propiedades','agenda'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_primary_vertical_idx" ON "users" ("primary_vertical");
