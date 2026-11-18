CREATE TABLE IF NOT EXISTS "agenda_reception_assignments" (
    "membership_id" uuid NOT NULL REFERENCES "account_users"("id") ON DELETE CASCADE,
    "professional_id" uuid NOT NULL REFERENCES "agenda_professional_profiles"("id") ON DELETE CASCADE,
    PRIMARY KEY ("membership_id", "professional_id")
);
