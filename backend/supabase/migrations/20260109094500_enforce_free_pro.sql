-- Enforce Free vs Pro differences at DB level
-- - Free: max 1 published listing, public page stays draft/private
-- - Pro: max 10 published listings, can activate public page

-- Public profiles should default to draft/private for new users.
ALTER TABLE public.public_profiles ALTER COLUMN is_public SET DEFAULT false;
ALTER TABLE public.public_profiles ALTER COLUMN status SET DEFAULT 'draft';

-- Helper: true only when the user has an active Pro subscription.
CREATE OR REPLACE FUNCTION public.is_pro_active_for_user(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND p.plan_key = 'pro'
      AND p.is_active = true
  );
$$;

-- Helper: resolve plan key for a listing owner (company first, else profile).
CREATE OR REPLACE FUNCTION public.get_plan_key_for_listing(p_user uuid, p_public_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_plan_key text;
BEGIN
  IF p_public_profile_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.public_profiles
    WHERE id = p_public_profile_id;
  END IF;

  IF v_company_id IS NOT NULL THEN
    SELECT plan_key INTO v_plan_key
    FROM public.companies
    WHERE id = v_company_id;
    RETURN COALESCE(v_plan_key, 'free');
  END IF;

  SELECT plan_key INTO v_plan_key
  FROM public.profiles
  WHERE id = p_user;

  RETURN COALESCE(v_plan_key, 'free');
END;
$$;

-- Enforce max published listings when a listing is (or remains) published.
CREATE OR REPLACE FUNCTION public.listing_publish_limit_ok(
  p_user uuid,
  p_public_profile_id uuid,
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
  v_plan_key text;
  v_limit int;
  v_published_count int;
BEGIN
  IF p_next_status IS DISTINCT FROM 'published' THEN
    RETURN true;
  END IF;

  v_plan_key := public.get_plan_key_for_listing(p_user, p_public_profile_id);
  v_limit := CASE WHEN v_plan_key = 'pro' THEN 10 ELSE 1 END;

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
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  ELSE
    SELECT count(*)::int INTO v_published_count
    FROM public.listings l
    WHERE l.user_id = p_user
      AND l.status = 'published'
      AND l.id <> p_listing_id;
  END IF;

  -- Publishing this listing would make it (count + 1)
  RETURN v_published_count < v_limit;
END;
$$;

-- Normalize existing public profiles: Free users should not have active/public pages.
UPDATE public.public_profiles pp
SET is_public = false,
    status = 'draft'
WHERE pp.company_id IS NULL
  AND pp.owner_profile_id IN (SELECT id FROM public.profiles WHERE plan_key IS NULL OR plan_key = 'free')
  AND (pp.is_public = true OR pp.status = 'active');

-- Tighten public_profiles insert/manage policies to enforce activation only for Pro.
DROP POLICY IF EXISTS "Public profiles insert" ON public.public_profiles;
CREATE POLICY "Public profiles insert" ON public.public_profiles
FOR INSERT
WITH CHECK (
  owner_profile_id = auth.uid()
  AND (company_id IS NULL OR public.is_company_owner(company_id, auth.uid()))
  AND (
    public.is_pro_active_for_user(owner_profile_id)
    OR (is_public = false AND status = 'draft')
  )
);

DROP POLICY IF EXISTS "Public profiles manage" ON public.public_profiles;
CREATE POLICY "Public profiles manage" ON public.public_profiles
FOR ALL
USING (
  owner_profile_id = auth.uid()
  OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid()))
)
WITH CHECK (
  (owner_profile_id = auth.uid() OR (company_id IS NOT NULL AND public.is_company_owner(company_id, auth.uid())))
  AND (
    public.is_pro_active_for_user(owner_profile_id)
    OR (is_public = false AND status = 'draft')
  )
);

-- Enforce publishing limits via listings policies.
DROP POLICY IF EXISTS "Manage own listings" ON public.listings;
CREATE POLICY "Manage own listings" ON public.listings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.listing_publish_limit_ok(user_id, public_profile_id, id, status)
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
    WHERE pp.id = public.listings.public_listings.public_profile_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
      AND cu.status = 'active'
  )
  AND public.listing_publish_limit_ok(user_id, public_profile_id, id, status)
);
