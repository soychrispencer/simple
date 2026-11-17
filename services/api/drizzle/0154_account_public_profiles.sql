-- A business workspace has one shared public profile per vertical.
-- Move existing catalog entries to the chosen shared profile before keeping
-- duplicate profile rows as unpublished personal drafts.
WITH ranked_profiles AS (
  SELECT
    id,
    account_id,
    vertical,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY is_published DESC, updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM public_profiles
  WHERE account_id IS NOT NULL
), winners AS (
  SELECT account_id, vertical, id
  FROM ranked_profiles
  WHERE position = 1
), duplicates AS (
  SELECT id, account_id, vertical
  FROM ranked_profiles
  WHERE position > 1
)
UPDATE marketplace_operator_services AS item
SET public_profile_id = winners.id
FROM duplicates
JOIN winners USING (account_id, vertical)
WHERE item.public_profile_id = duplicates.id;
--> statement-breakpoint
WITH ranked_profiles AS (
  SELECT
    id,
    account_id,
    vertical,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY is_published DESC, updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM public_profiles
  WHERE account_id IS NOT NULL
), winners AS (
  SELECT account_id, vertical, id
  FROM ranked_profiles
  WHERE position = 1
), duplicates AS (
  SELECT id, account_id, vertical
  FROM ranked_profiles
  WHERE position > 1
)
UPDATE marketplace_operator_service_packs AS item
SET public_profile_id = winners.id
FROM duplicates
JOIN winners USING (account_id, vertical)
WHERE item.public_profile_id = duplicates.id;
--> statement-breakpoint
WITH ranked_profiles AS (
  SELECT
    id,
    account_id,
    vertical,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY is_published DESC, updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM public_profiles
  WHERE account_id IS NOT NULL
), winners AS (
  SELECT account_id, vertical, id
  FROM ranked_profiles
  WHERE position = 1
), duplicates AS (
  SELECT id, account_id, vertical
  FROM ranked_profiles
  WHERE position > 1
)
UPDATE marketplace_operator_service_promotions AS item
SET public_profile_id = winners.id
FROM duplicates
JOIN winners USING (account_id, vertical)
WHERE item.public_profile_id = duplicates.id;
--> statement-breakpoint
WITH ranked_profiles AS (
  SELECT
    id,
    account_id,
    vertical,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY is_published DESC, updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM public_profiles
  WHERE account_id IS NOT NULL
), winners AS (
  SELECT account_id, vertical, id
  FROM ranked_profiles
  WHERE position = 1
), duplicates AS (
  SELECT id, account_id, vertical
  FROM ranked_profiles
  WHERE position > 1
)
UPDATE marketplace_operator_products AS item
SET public_profile_id = winners.id
FROM duplicates
JOIN winners USING (account_id, vertical)
WHERE item.public_profile_id = duplicates.id;
--> statement-breakpoint
WITH ranked_profiles AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY account_id, vertical
      ORDER BY is_published DESC, updated_at DESC, created_at ASC, id ASC
    ) AS position
  FROM public_profiles
  WHERE account_id IS NOT NULL
)
UPDATE public_profiles AS profile
SET account_id = NULL,
    is_published = false
FROM ranked_profiles
WHERE ranked_profiles.id = profile.id
  AND ranked_profiles.position > 1;
--> statement-breakpoint
DROP INDEX IF EXISTS public_profiles_user_vertical_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS public_profiles_account_vertical_idx
  ON public_profiles (account_id, vertical)
  WHERE account_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS public_profiles_user_vertical_legacy_idx
  ON public_profiles (user_id, vertical)
  WHERE account_id IS NULL;
