-- Add context and routing fields to messages for buy/sell and company-aware inbox
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS context text DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS public_profile_id uuid REFERENCES public.public_profiles(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz DEFAULT now();

-- Indexes for inbox filters and unread counts
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_listing ON public.messages (listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_company ON public.messages (company_id);
CREATE INDEX IF NOT EXISTS idx_messages_context ON public.messages (context);
CREATE INDEX IF NOT EXISTS idx_messages_last_event ON public.messages (last_event_at DESC);

-- Backfill last_event_at from created_at for existing rows
UPDATE public.messages SET last_event_at = created_at WHERE last_event_at IS NULL;
