-- Migrate timezones from business profiles to users (solo si el usuario sigue en el default)

UPDATE users
SET timezone = ap.timezone
FROM agenda_professional_profiles ap
WHERE users.id = ap.user_id
AND ap.timezone IS NOT NULL
AND ap.timezone != 'America/Santiago'
AND users.timezone = 'America/Santiago';

UPDATE users
SET timezone = spg.timezone
FROM serenata_provider_groups spg
WHERE users.id = spg.owner_user_id
AND spg.timezone IS NOT NULL
AND spg.timezone != 'America/Santiago'
AND users.timezone = 'America/Santiago';
