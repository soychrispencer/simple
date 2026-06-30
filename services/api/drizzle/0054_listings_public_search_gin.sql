-- Índices GIN jsonb para filtros de búsqueda pública (public-search-sql.ts: marca, modelo, región, comuna, q).
CREATE INDEX IF NOT EXISTS "listings_raw_data_gin_idx" ON "listings" USING gin ("raw_data" jsonb_path_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_location_data_gin_idx" ON "listings" USING gin ("location_data" jsonb_path_ops);
