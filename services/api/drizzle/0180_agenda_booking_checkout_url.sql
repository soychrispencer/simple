ALTER TABLE agenda_appointments
  ADD COLUMN IF NOT EXISTS mp_checkout_url varchar(2000),
  ADD COLUMN IF NOT EXISTS booking_payment_method varchar(16);
