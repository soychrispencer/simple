ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_legal_name" varchar(200);
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "business_tax_id" varchar(20);
