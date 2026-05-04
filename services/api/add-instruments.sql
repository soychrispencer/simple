-- Add instruments column to serenata_musicians table
ALTER TABLE serenata_musicians ADD COLUMN IF NOT EXISTS instruments VARCHAR(255)[];
