-- Plan Esencial eliminado: solo free | pro (agenda/serenatas) y free | pro | enterprise (marketplace)
UPDATE agenda_professional_profiles
SET plan = 'free', updated_at = NOW()
WHERE plan NOT IN ('free', 'pro');

DELETE FROM subscription_plans WHERE plan_id = 'essential';
