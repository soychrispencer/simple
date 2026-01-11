-- Multi-vertical subscriptions + per-vertical plan keys
-- Date: 2026-01-10

BEGIN;

-- 1) Ensure plans are scoped to a vertical (backfill existing rows).
DO $$
DECLARE
  v_vehicles_id uuid;
BEGIN
  SELECT id INTO v_vehicles_id
  FROM public.verticals
  WHERE key = 'vehicles'
  LIMIT 1;

  IF v_vehicles_id IS NULL THEN
    RAISE EXCEPTION 'verticals row with key=vehicles not found';
  END IF;

  -- Backfill any legacy plans that were inserted without vertical_id.
  UPDATE public.subscription_plans
  SET vertical_id = v_vehicles_id
  WHERE vertical_id IS NULL;
END $$;

-- Drop legacy global uniqueness and enforce (vertical_id, plan_key).
ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_plan_key_key;

ALTER TABLE public.subscription_plans
  ALTER COLUMN vertical_id SET NOT NULL;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_vertical_plan_key_key UNIQUE (vertical_id, plan_key);


-- 2) Subscriptions become per (target + vertical).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS vertical_id uuid;

-- Backfill vertical_id from the selected plan.
UPDATE public.subscriptions s
SET vertical_id = p.vertical_id
FROM public.subscription_plans p
WHERE p.id = s.plan_id
  AND s.vertical_id IS NULL;

-- Safety: fail early if any subscription still cannot resolve vertical.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE vertical_id IS NULL) THEN
    RAISE EXCEPTION 'subscriptions.vertical_id backfill failed: found NULL vertical_id rows';
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ALTER COLUMN vertical_id SET NOT NULL;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_vertical_id_fkey
  FOREIGN KEY (vertical_id) REFERENCES public.verticals(id) ON DELETE CASCADE;

-- Keep subscriptions.vertical_id consistent with plan_id.
CREATE OR REPLACE FUNCTION public.sync_subscription_vertical_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_vertical uuid;
BEGIN
  SELECT vertical_id INTO v_plan_vertical
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  IF v_plan_vertical IS NULL THEN
    RAISE EXCEPTION 'subscription_plans.vertical_id is NULL for plan_id %', NEW.plan_id;
  END IF;

  IF NEW.vertical_id IS NULL THEN
    NEW.vertical_id := v_plan_vertical;
  ELSIF NEW.vertical_id <> v_plan_vertical THEN
    RAISE EXCEPTION 'subscriptions.vertical_id (%) must match plan vertical_id (%)', NEW.vertical_id, v_plan_vertical;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subscription_vertical_id ON public.subscriptions;
CREATE TRIGGER trg_sync_subscription_vertical_id
BEFORE INSERT OR UPDATE OF plan_id, vertical_id
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_subscription_vertical_id();

-- Legacy plan caching is global; it becomes incorrect with multi-vertical subscriptions.
DROP TRIGGER IF EXISTS trg_sync_plan ON public.subscriptions;

-- Replace "one subscription per user/company" with "one subscription per user/company per vertical".
DROP INDEX IF EXISTS public.ux_subscriptions_user;
DROP INDEX IF EXISTS public.ux_subscriptions_company;

CREATE UNIQUE INDEX ux_subscriptions_user_vertical
  ON public.subscriptions(user_id, vertical_id)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX ux_subscriptions_company_vertical
  ON public.subscriptions(company_id, vertical_id)
  WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_vertical ON public.subscriptions(vertical_id);

COMMIT;
