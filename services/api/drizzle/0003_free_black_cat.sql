CREATE TABLE "instagram_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"instagram_user_id" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"account_type" varchar(50),
	"profile_picture_url" varchar(500),
	"access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"scopes" jsonb,
	"auto_publish_enabled" boolean DEFAULT false NOT NULL,
	"caption_template" text,
	"status" varchar(20) DEFAULT 'connected' NOT NULL,
	"last_synced_at" timestamp,
	"last_published_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instagram_account_id" uuid NOT NULL,
	"vertical" varchar(20) NOT NULL,
	"listing_id" varchar(255) NOT NULL,
	"listing_title" varchar(255) NOT NULL,
	"instagram_media_id" varchar(255),
	"instagram_permalink" varchar(500),
	"caption" text NOT NULL,
	"image_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"error_message" text,
	"source_updated_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_publications" ADD CONSTRAINT "instagram_publications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_publications" ADD CONSTRAINT "instagram_publications_instagram_account_id_instagram_accounts_id_fk" FOREIGN KEY ("instagram_account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_accounts_user_vertical_idx" ON "instagram_accounts" USING btree ("user_id","vertical");