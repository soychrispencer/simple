ALTER TABLE serenata_groups
ADD COLUMN IF NOT EXISTS required_instruments jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE serenata_groups
SET required_instruments = (
    SELECT COALESCE(jsonb_agg('Músico ' || n ORDER BY n), '[]'::jsonb)
    FROM generate_series(1, GREATEST(COALESCE(max_musicians, 3), 1)) AS n
)
WHERE required_instruments = '[]'::jsonb;
