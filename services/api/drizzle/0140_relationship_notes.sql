CREATE TABLE IF NOT EXISTS "relationship_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"business_id" uuid NOT NULL,
	"person_kind" varchar(40) NOT NULL DEFAULT 'opaque',
	"person_id" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationship_notes" ADD CONSTRAINT "relationship_notes_author_user_id_users_id_fk"
  FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationship_notes_business_person_created_idx"
	ON "relationship_notes" ("vertical", "business_id", "person_id", "created_at");
