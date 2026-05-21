-- Reparación serenata_group_members: columnas Drizzle ausentes en BD legacy.

ALTER TABLE "serenata_group_members"
    ADD COLUMN IF NOT EXISTS "instrument" varchar(80),
    ADD COLUMN IF NOT EXISTS "status" varchar(30) DEFAULT 'invited' NOT NULL,
    ADD COLUMN IF NOT EXISTS "message" text,
    ADD COLUMN IF NOT EXISTS "slot_index" integer,
    ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL,
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
