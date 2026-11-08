ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_cycle varchar(12) NOT NULL DEFAULT 'monthly';
