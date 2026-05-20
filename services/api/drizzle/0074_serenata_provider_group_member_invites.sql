CREATE TABLE IF NOT EXISTS "serenata_provider_group_member_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_group_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"display_name" varchar(160),
	"email" varchar(255),
	"phone" varchar(40),
	"token" varchar(64) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"musician_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_provider_group_member_invites" ADD CONSTRAINT "serenata_provider_group_member_invites_provider_group_id_serenata_provider_groups_id_fk" FOREIGN KEY ("provider_group_id") REFERENCES "public"."serenata_provider_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_provider_group_member_invites" ADD CONSTRAINT "serenata_provider_group_member_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serenata_provider_group_member_invites" ADD CONSTRAINT "serenata_provider_group_member_invites_musician_id_serenata_musicians_id_fk" FOREIGN KEY ("musician_id") REFERENCES "public"."serenata_musicians"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serenata_provider_group_member_invites_token_idx" ON "serenata_provider_group_member_invites" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_group_member_invites_provider_idx" ON "serenata_provider_group_member_invites" USING btree ("provider_group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serenata_provider_group_member_invites_status_idx" ON "serenata_provider_group_member_invites" USING btree ("status");
