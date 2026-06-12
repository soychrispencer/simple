-- Migrate timezones from business profiles to users table

-- Migrate timezone from agenda_professional_profiles to users
UPDATE users
SET timezone = ap.timezone
FROM agenda_professional_profiles ap
WHERE users.id = ap.userId
AND ap.timezone IS NOT NULL
AND ap.timezone != 'America/Santiago';

-- Migrate timezone from serenatas_provider_groups to users
UPDATE users
SET timezone = spg.timezone
FROM serenatas_provider_groups spg
JOIN serenatas_provider_group_members spgm ON spg.groupId = spg.id
WHERE users.id = spgm.userId
AND spg.timezone IS NOT NULL
AND spg.timezone != 'America/Santiago';
