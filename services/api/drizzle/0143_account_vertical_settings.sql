CREATE TABLE IF NOT EXISTS account_vertical_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL,
  account_kind varchar(20) NOT NULL DEFAULT 'individual',
  operator_subtype varchar(40),
  operator_subtype_custom varchar(160),
  onboarding_completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS account_vertical_settings_account_vertical_idx
  ON account_vertical_settings (account_id, vertical);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS account_vertical_settings_vertical_idx
  ON account_vertical_settings (vertical);
--> statement-breakpoint
INSERT INTO account_vertical_settings (
  account_id,
  vertical,
  account_kind,
  operator_subtype,
  operator_subtype_custom,
  onboarding_completed_at,
  created_at,
  updated_at
)
SELECT DISTINCT ON (account_id, vertical)
  account_id,
  vertical,
  account_kind,
  operator_subtype,
  operator_subtype_custom,
  CASE WHEN operator_subtype IS NOT NULL OR is_published THEN updated_at ELSE NULL END,
  created_at,
  updated_at
FROM public_profiles
WHERE account_id IS NOT NULL
ORDER BY account_id, vertical, is_published DESC, updated_at DESC
ON CONFLICT (account_id, vertical) DO NOTHING;
