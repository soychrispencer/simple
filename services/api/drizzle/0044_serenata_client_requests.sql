ALTER TABLE "serenatas" ADD COLUMN IF NOT EXISTS "client_id" uuid;
--> statement-breakpoint
ALTER TABLE "serenatas" DROP CONSTRAINT IF EXISTS "serenatas_client_id_serenata_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_client_id_serenata_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."serenata_clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenatas_client_idx" ON "serenatas" USING btree ("client_id");
