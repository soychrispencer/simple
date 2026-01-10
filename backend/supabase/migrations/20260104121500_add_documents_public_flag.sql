-- Adds per-document public visibility.
-- Documents remain stored in the private `documents` bucket; this flag only controls whether
-- the document metadata (name/type/size) is visible on public listing pages.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_documents_listing_public
      ON public.documents (listing_id, is_public);

    -- Allow anyone to read public documents for published listings.
    -- (No storage access; only metadata rows.)
    DROP POLICY IF EXISTS "Published public documents" ON public.documents;
    CREATE POLICY "Published public documents" ON public.documents
      FOR SELECT
      USING (
        is_public = true
        AND EXISTS (
          SELECT 1 FROM public.listings
          WHERE id = listing_id AND status = 'published'
        )
      );
  END IF;
END $$;
