-- Eliminar CRM integrado (leads, pipeline, equipos comerciales)

ALTER TABLE message_threads DROP CONSTRAINT IF EXISTS message_threads_lead_id_listing_leads_id_fk;
ALTER TABLE message_threads DROP COLUMN IF EXISTS lead_id;

DROP TABLE IF EXISTS listing_lead_activities CASCADE;
DROP TABLE IF EXISTS listing_leads CASCADE;
DROP TABLE IF EXISTS service_lead_activities CASCADE;
DROP TABLE IF EXISTS service_leads CASCADE;
DROP TABLE IF EXISTS crm_pipeline_columns CASCADE;

ALTER TABLE public_profile_team_members DROP COLUMN IF EXISTS receives_leads;
ALTER TABLE public_profile_team_members DROP COLUMN IF EXISTS is_lead_contact;
ALTER TABLE public_profiles DROP COLUMN IF EXISTS lead_routing_mode;
ALTER TABLE public_profiles DROP COLUMN IF EXISTS lead_routing_cursor;
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS crm_enabled;
