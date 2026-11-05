-- Existing SimpleAgenda accounts start in Gratis under the new plan strategy.
-- Keep profiles and public links intact; an expired timestamp prevents old trials from reopening.
UPDATE agenda_professional_profiles
SET plan = 'free',
    plan_expires_at = now() - interval '1 minute',
    updated_at = now();
--> statement-breakpoint
-- No Agenda subscriptions are currently active. Retain their history and mark any legacy
-- active billing rows as cancelled so the account view cannot restore an old paid plan.
UPDATE subscriptions AS s
SET status = 'cancelled',
    provider_status = 'cancelled',
    cancelled_at = COALESCE(s.cancelled_at, now()),
    updated_at = now()
FROM subscription_plans AS p
WHERE p.id = s.plan_id
  AND p.vertical = 'agenda'
  AND s.vertical = 'agenda'
  AND s.status = 'active';
