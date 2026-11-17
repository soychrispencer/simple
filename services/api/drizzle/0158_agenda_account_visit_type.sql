ALTER TABLE agenda_account_visits
  ADD COLUMN visit_type varchar(30) NOT NULL DEFAULT 'property_visit';
