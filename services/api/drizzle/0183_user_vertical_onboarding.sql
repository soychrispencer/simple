CREATE TABLE IF NOT EXISTS user_vertical_onboarding (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vertical varchar(20) NOT NULL CHECK (vertical IN ('autos', 'propiedades', 'agenda', 'serenatas')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status varchar(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'deferred', 'completed')),
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 3),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp NOT NULL DEFAULT now(),
  deferred_at timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vertical),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status <> 'deferred' OR deferred_at IS NOT NULL)
);
