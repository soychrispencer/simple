-- Hilos de mensajes con contexto de plataforma (serenatas, agenda) además de listings

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS context_type varchar(40),
  ADD COLUMN IF NOT EXISTS context_id uuid;

UPDATE message_threads
SET
  context_type = 'listing',
  context_id = listing_id
WHERE context_type IS NULL
  AND listing_id IS NOT NULL;

ALTER TABLE message_threads
  ALTER COLUMN listing_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE message_threads ALTER COLUMN lead_id DROP NOT NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS message_threads_listing_buyer_idx;

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_listing_buyer_idx
  ON message_threads (listing_id, buyer_user_id)
  WHERE listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_context_buyer_idx
  ON message_threads (context_type, context_id, buyer_user_id)
  WHERE context_type IS NOT NULL AND context_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_threads_context_idx
  ON message_threads (context_type, context_id);
