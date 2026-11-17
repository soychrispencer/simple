ALTER TABLE "account_relationship_assignments"
  ADD COLUMN "stage" varchar(30) NOT NULL DEFAULT 'new';
