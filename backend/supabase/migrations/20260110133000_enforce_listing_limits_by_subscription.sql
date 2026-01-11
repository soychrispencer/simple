-- Enforce listing publish limits using subscriptions per vertical
-- Date: 2026-01-10

BEGIN;

-- Helper: return the best active plan for a listing owner + vertical.
-- - Company subscription (if public_profile belongs to company) wins.
-- - Otherwise user subscription.
CREATE OR REPLACE FUNCTION public.get_active_plan_for_listing(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid
)
RETURNS TABLE(
  plan_key text,
  limits jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF p_vertical_id IS NULL THEN
    RETURN;
  END IF;

  IF p_public_profile_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.public_profiles
    WHERE id = p_public_profile_id;
  END IF;

  IF v_company_id IS NOT NULL THEN
    RETURN QUERY
      SELECT p.plan_key, p.limits
      FROM public.subscriptions s
      JOIN public.subscription_plans p ON p.id = s.plan_id
      WHERE s.company_id = v_company_id
        AND s.vertical_id = p_vertical_id
        AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
        AND p.is_active = true
      ORDER BY COALESCE(p.price_monthly, 0) DESC
      LIMIT 1;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.plan_key, p.limits
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user
      AND s.vertical_id = p_vertical_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND p.is_active = true
    ORDER BY COALESCE(p.price_monthly, 0) DESC
    LIMIT 1;
END;
$$;

-- New enforcement function (per-vertical, per-target).
CREATE OR REPLACE FUNCTION public.listing_publish_limit_ok_v2(
  p_user uuid,
  p_public_profile_id uuid,
  p_vertical_id uuid,
  p_listing_id uuid,
  p_next_status public.listing_status
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
  v_published_count int;
  v_limits jsonb;
BEGIN
  IF p_next_status IS DISTINCT FROM 'published' THEN
    RETURN true;
  END IF;

  IF p_vertical_id IS NULL THEN
    -- Should not happen (vertical_id is NOT NULL), but keep safe behavior.
    RETURN false;
  END IF;

  -- Resolve limits from active subscription (if any).
  SELECT g.limits INTO v_limits
  FROM public.get_active_plan_for_listing(p_user, p_public_profile_id, p_vertical_id) g
  LIMIT 1;

  -- Free: 1 publicación activa (por vertical).
  v_limit := 1;

  IF v_limits IS NOT NULL THEN
    v_limit := COALESCE(
      NULLIF((v_limits->>'max_active_listings')::int, 0),
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
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    JOIN public.public_profiles pp ON pp.id = l.public_profile_id
    WHERE pp.company_id = v_company_id
      AND l.vertical_id = p_vertical_id
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  ELSE
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.vertical_id = p_vertical_id
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  END IF;

  RETURN v_published_count < v_limit;
END;
$$;

-- Re-apply listings policies to use the new function (keeps same policy names).
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
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
  AND public.listing_publish_limit_ok_v2(user_id, public_profile_id, vertical_id, id, status)
);

COMMIT;
