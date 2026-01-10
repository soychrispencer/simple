import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export interface RawPropertyListing {
  id: string;
  title: string;
  description?: string | null;
  listing_type: string;
  price?: number | null;
  currency?: string | null;
  metadata?: Record<string, any> | null;
  status?: string | null;
  visibility?: string | null;
  region_id?: string | null;
  commune_id?: string | null;
  listings_properties?: Record<string, any> | null;
  images?: Array<{ id: string; url: string; is_primary?: boolean | null; position?: number | null }> | null;
  regions?: { name?: string | null } | null;
  communes?: { name?: string | null } | null;
}

export async function loadPropertyForWizard(id: string): Promise<RawPropertyListing | null> {
  const supabase = createPagesBrowserClient();
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listings_properties(*),
      images(id, url, is_primary, position),
      regions(name),
      communes(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as RawPropertyListing | null;
}
