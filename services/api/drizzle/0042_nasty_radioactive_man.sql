CREATE TABLE "serenata_coordinators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"comuna" varchar(120),
	"region" varchar(120),
	"min_price" integer,
	"max_price" integer,
	"subscription_status" varchar(30) DEFAULT 'trialing' NOT NULL,
	"subscription_price" integer DEFAULT 19990 NOT NULL,
	"commission_rate_bps" integer DEFAULT 800 NOT NULL,
	"commission_vat_rate_bps" integer DEFAULT 1900 NOT NULL,
	"trial_ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(40),
	"comuna" varchar(120),
	"region" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"musician_id" uuid NOT NULL,
	"instrument" varchar(80),
	"status" varchar(30) DEFAULT 'invited' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"date" timestamp NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_musicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instrument" varchar(80),
	"instruments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text,
	"comuna" varchar(120),
	"region" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"is_available" boolean DEFAULT true NOT NULL,
	"available_now" boolean DEFAULT false NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenata_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(60) NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serenatas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinator_id" uuid NOT NULL,
	"group_id" uuid,
	"source" varchar(30) DEFAULT 'own_lead' NOT NULL,
	"status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"recipient_name" varchar(160) NOT NULL,
	"client_phone" varchar(40),
	"address" text NOT NULL,
	"comuna" varchar(120),
	"region" varchar(120),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"event_date" timestamp NOT NULL,
	"event_time" varchar(10) NOT NULL,
	"duration" integer DEFAULT 45 NOT NULL,
	"price" integer,
	"event_type" varchar(80),
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "serenata_coordinators" ADD CONSTRAINT "serenata_coordinators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_clients" ADD CONSTRAINT "serenata_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_group_members" ADD CONSTRAINT "serenata_group_members_group_id_serenata_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."serenata_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_group_members" ADD CONSTRAINT "serenata_group_members_musician_id_serenata_musicians_id_fk" FOREIGN KEY ("musician_id") REFERENCES "public"."serenata_musicians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_groups" ADD CONSTRAINT "serenata_groups_coordinator_id_serenata_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."serenata_coordinators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_musicians" ADD CONSTRAINT "serenata_musicians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenata_notifications" ADD CONSTRAINT "serenata_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_coordinator_id_serenata_coordinators_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."serenata_coordinators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serenatas" ADD CONSTRAINT "serenatas_group_id_serenata_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."serenata_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "serenata_coordinators_user_idx" ON "serenata_coordinators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "serenata_clients_user_idx" ON "serenata_clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "serenata_clients_location_idx" ON "serenata_clients" USING btree ("region","comuna");--> statement-breakpoint
CREATE INDEX "serenata_group_members_group_idx" ON "serenata_group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "serenata_group_members_musician_idx" ON "serenata_group_members" USING btree ("musician_id");--> statement-breakpoint
CREATE UNIQUE INDEX "serenata_group_members_unique_idx" ON "serenata_group_members" USING btree ("group_id","musician_id");--> statement-breakpoint
CREATE INDEX "serenata_groups_coordinator_idx" ON "serenata_groups" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX "serenata_groups_date_idx" ON "serenata_groups" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "serenata_musicians_user_idx" ON "serenata_musicians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "serenata_musicians_location_idx" ON "serenata_musicians" USING btree ("region","comuna");--> statement-breakpoint
CREATE INDEX "serenata_notifications_user_idx" ON "serenata_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "serenata_notifications_read_idx" ON "serenata_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "serenatas_coordinator_idx" ON "serenatas" USING btree ("coordinator_id");--> statement-breakpoint
CREATE INDEX "serenatas_group_idx" ON "serenatas" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "serenatas_event_date_idx" ON "serenatas" USING btree ("event_date");
