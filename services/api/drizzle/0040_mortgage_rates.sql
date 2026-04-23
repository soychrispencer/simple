-- Mortgage rates table for automatic updates in simulator
CREATE TABLE IF NOT EXISTS "mortgage_rates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "standard_rate" decimal(5,2) NOT NULL DEFAULT '5.50',
    "subsidy_rate" decimal(5,2) NOT NULL DEFAULT '4.19',
    "best_market_rate" decimal(5,2) NOT NULL DEFAULT '3.39',
    "source_url" text,
    "source_name" varchar(100) NOT NULL DEFAULT 'Neat Pagos',
    "updated_at" timestamp NOT NULL DEFAULT now(),
    "updated_by" uuid REFERENCES "users"("id"),
    "is_active" boolean NOT NULL DEFAULT true,
    "notes" text
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "mortgage_rates_active_idx" ON "mortgage_rates" ("is_active");
CREATE INDEX IF NOT EXISTS "mortgage_rates_updated_at_idx" ON "mortgage_rates" ("updated_at");

-- Insert initial data with current rates (April 2026)
INSERT INTO "mortgage_rates" ("standard_rate", "subsidy_rate", "best_market_rate", "source_name", "source_url", "updated_at", "is_active", "notes")
VALUES ('5.50', '4.19', '3.39', 'Neat Pagos', 'https://www.neatpagos.com/blog/articulo/mejor-tasa-credito-hipotecario', now(), true, 'Tasas actualizadas Abril 2026. Mejor tasa: Itaú 3.39%, Subsidio BancoEstado: 4.19%');
