CREATE INDEX "listings_owner_id_idx" ON "listings" ("owner_id");
--> statement-breakpoint
CREATE INDEX "listings_vertical_section_status_idx" ON "listings" ("vertical", "section", "status");
--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" ("email");
--> statement-breakpoint
CREATE INDEX "saved_listings_user_id_idx" ON "saved_listings" ("user_id");
