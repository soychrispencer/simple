CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  type varchar(30) NOT NULL DEFAULT 'general',
  owner_user_id uuid NOT NULL REFERENCES users(id),
  is_personal boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_owner_idx
  ON accounts(owner_user_id);

CREATE TABLE IF NOT EXISTS account_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role varchar(20) NOT NULL DEFAULT 'owner',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_users_account_user_idx
  ON account_users(account_id, user_id);

CREATE INDEX IF NOT EXISTS account_users_user_idx
  ON account_users(user_id);

CREATE INDEX IF NOT EXISTS account_users_account_idx
  ON account_users(account_id);

INSERT INTO accounts (name, type, owner_user_id, is_personal)
SELECT
  COALESCE(NULLIF(trim(u.name), ''), split_part(u.email, '@', 1)),
  'general',
  u.id,
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM account_users au
  WHERE au.user_id = u.id
    AND au.is_default = true
);

INSERT INTO account_users (account_id, user_id, role, is_default)
SELECT
  a.id,
  a.owner_user_id,
  'owner',
  true
FROM accounts a
WHERE a.is_personal = true
  AND NOT EXISTS (
    SELECT 1
    FROM account_users au
    WHERE au.account_id = a.id
      AND au.user_id = a.owner_user_id
  );

ALTER TABLE listings ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE boost_orders ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE instagram_publications ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE address_book ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE crm_pipeline_columns ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE service_leads ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE listing_leads ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE agenda_professional_profiles ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);

UPDATE listings t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.owner_id
  AND au.is_default = true;

UPDATE boost_orders t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE instagram_accounts t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE instagram_publications t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE public_profiles t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE address_book t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE crm_pipeline_columns t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE service_leads t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE listing_leads t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.owner_user_id
  AND au.is_default = true;

UPDATE message_threads t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.owner_user_id
  AND au.is_default = true;

UPDATE ad_campaigns t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE agenda_professional_profiles t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE push_subscriptions t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE subscriptions t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

UPDATE payment_orders t
SET account_id = au.account_id
FROM account_users au
WHERE t.account_id IS NULL
  AND au.user_id = t.user_id
  AND au.is_default = true;

CREATE INDEX IF NOT EXISTS listings_account_id_idx ON listings(account_id);
CREATE INDEX IF NOT EXISTS boost_orders_account_id_idx ON boost_orders(account_id);
CREATE INDEX IF NOT EXISTS instagram_accounts_account_id_idx ON instagram_accounts(account_id);
CREATE INDEX IF NOT EXISTS instagram_publications_account_id_idx ON instagram_publications(account_id);
CREATE INDEX IF NOT EXISTS public_profiles_account_id_idx ON public_profiles(account_id);
CREATE INDEX IF NOT EXISTS address_book_account_id_idx ON address_book(account_id);
CREATE INDEX IF NOT EXISTS crm_pipeline_columns_account_id_idx ON crm_pipeline_columns(account_id);
CREATE INDEX IF NOT EXISTS service_leads_account_id_idx ON service_leads(account_id);
CREATE INDEX IF NOT EXISTS listing_leads_account_id_idx ON listing_leads(account_id);
CREATE INDEX IF NOT EXISTS message_threads_account_id_idx ON message_threads(account_id);
CREATE INDEX IF NOT EXISTS ad_campaigns_account_id_idx ON ad_campaigns(account_id);
CREATE INDEX IF NOT EXISTS agenda_professional_profiles_account_id_idx ON agenda_professional_profiles(account_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_account_id_idx ON push_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS subscriptions_account_id_idx ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS payment_orders_account_id_idx ON payment_orders(account_id);
