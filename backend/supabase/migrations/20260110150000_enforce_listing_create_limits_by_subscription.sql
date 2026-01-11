-- Enforce listing creation limits using subscriptions per vertical
-- Date: 2026-01-10

BEGIN;

-- Limit total listings creation (drafts/duplicates) for Free and plan-defined limits.
CREATE OR REPLACE FUNCTION public.listing_create_limit_ok_v2(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid,
  p_listing_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_limit int;
  v_total_count int;
  v_limits jsonb;
BEGIN
  IF p_vertical_id IS NULL THEN
    RETURN false;
  END IF;

  -- Resolve limits from active subscription (if any).
  SELECT g.limits INTO v_limits
  FROM public.get_active_plan_for_listing(p_user, p_public_profile_id, p_vertical_id) g
  LIMIT 1;

  -- Free: 1 publicación total (por vertical).
  v_limit := 1;

  IF v_limits IS NOT NULL THEN
    -- max_total_listings is preferred; fallback to max_listings when present.
    v_limit := COALESCE(
      NULLIF((v_limits->>'max_total_listings')::int, 0),
      NULLIF((v_limits->>'max_listings')::int, 0),
      v_limit
    );
  END IF;

  -- unlimited safety
  IF v_limit < 0 THEN
    RETURN true;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.public_profiles
  WHERE id = p_public_profile_id;

  IF v_company_id IS NOT NULL THEN
    SELECT count(*)::int INTO v_total_count
    FROM public.listings l
    JOIN public.public_profiles pp ON pp.id = l.public_profile_id
    WHERE pp.company_id = v_company_id
      AND l.vertical_id = p_vertical_id
      AND (p_listing_id IS NULL OR l.id <> p_listing_id);
  ELSE
    SELECT count(*)::int INTO v_total_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.vertical_id = p_vertical_id
      AND (p_listing_id IS NULL OR l.id <> p_listing_id);
  END IF;

  RETURN v_total_count < v_limit;
END;
$$;

-- Re-apply listings policies to include creation limit.
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.listing_create_limit_ok_v2(user_id, public_profile_id, vertical_id, id)
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

DROP POLICY IF EXISTS "Manage company listings" ON public.listings;
CREATE POLICY "Manage company listings" ON public.listings
FOR ALL
USING (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  public_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.public_profiles pp
    JOIN public.company_users cu ON cu.company_id = pp.company_id
    WHERE pp.id = public.listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
  AND public.listing_create_limit_ok_v2(user_id, public_profile_id, vertical_id, id)
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

COMMIT;
