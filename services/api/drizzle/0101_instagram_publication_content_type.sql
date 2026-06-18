ALTER TABLE "instagram_publications" ADD COLUMN IF NOT EXISTS "content_type" varchar(20) NOT NULL DEFAULT 'carousel';
