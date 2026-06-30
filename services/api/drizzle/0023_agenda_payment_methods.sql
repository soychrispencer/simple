-- Add payment method fields to agenda_professional_profiles
ALTER TABLE agenda_professional_profiles
  ADD COLUMN IF NOT EXISTS mp_access_token text,
  ADD COLUMN IF NOT EXISTS mp_public_key varchar(255),
  ADD COLUMN IF NOT EXISTS mp_user_id varchar(100),
  ADD COLUMN IF NOT EXISTS mp_refresh_token text,
  ADD COLUMN IF NOT EXISTS payment_link_url varchar(500),
  ADD COLUMN IF NOT EXISTS bank_transfer_data jsonb;
