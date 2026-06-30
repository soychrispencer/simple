-- Add arrival_instructions to address_book, drop unused contact_name and contact_phone
ALTER TABLE address_book ADD COLUMN IF NOT EXISTS arrival_instructions text;
ALTER TABLE address_book DROP COLUMN IF EXISTS contact_name;
ALTER TABLE address_book DROP COLUMN IF EXISTS contact_phone;
