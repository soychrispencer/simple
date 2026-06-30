ALTER TABLE "serenata_groups" ADD COLUMN IF NOT EXISTS "provider_group_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_groups" ADD CONSTRAINT "serenata_groups_provider_group_id_fk" FOREIGN KEY ("provider_group_id") REFERENCES "public"."serenata_provider_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_groups_provider_idx" ON "serenata_groups" USING btree ("provider_group_id");
