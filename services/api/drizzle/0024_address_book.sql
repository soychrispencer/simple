-- Create address_book table
CREATE TABLE IF NOT EXISTS address_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL DEFAULT 'personal',
  label varchar(100) NOT NULL DEFAULT '',
  country_code varchar(3) NOT NULL DEFAULT 'CL',
  region_id varchar(50),
  region_name varchar(120),
  commune_id varchar(50),
  commune_name varchar(120),
  neighborhood varchar(120),
  address_line_1 varchar(255),
  address_line_2 varchar(255),
  postal_code varchar(20),
  contact_name varchar(160),
  contact_phone varchar(40),
  is_default boolean NOT NULL DEFAULT false,
  geo_point jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS address_book_user_id_idx ON address_book(user_id);
