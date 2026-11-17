ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(255);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS timeline_events_idempotency_key_idx
  ON timeline_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
