-- Desactiva plan Esencial en catálogo de suscripciones
UPDATE subscription_plans
SET is_active = false, updated_at = NOW()
WHERE plan_id = 'essential';

-- Agenda: trial 30 días para perfiles free/essential (no toca plan pro)
UPDATE agenda_professional_profiles
SET
    plan = 'free',
    plan_expires_at = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE plan IN ('free', 'essential')
  AND (plan_expires_at IS NULL OR plan_expires_at < NOW());

-- Serenatas: trial 30 días para dueños sin suscripción Pro activa
UPDATE serenata_owners
SET
    trial_ends_at = NOW() + INTERVAL '30 days',
    subscription_status = 'trialing',
    updated_at = NOW()
WHERE subscription_status IS DISTINCT FROM 'active';
