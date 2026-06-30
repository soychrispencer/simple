ALTER TABLE "listing_leads" ADD COLUMN "priority" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_leads" ADD COLUMN "close_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "listing_leads" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_leads" ADD COLUMN "last_activity_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "priority" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "close_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "service_leads" ADD COLUMN "last_activity_at" timestamp DEFAULT now() NOT NULL;