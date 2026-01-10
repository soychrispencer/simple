import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export interface SaveSpecsParams {
  vehicleId: string;
  typeSlug: string;
  specs: Record<string, any>;
}

export interface SaveSpecsResult {
  ok: boolean;
  error?: string;
}

export async function saveVehicleSpecs({ vehicleId, specs }: SaveSpecsParams): Promise<SaveSpecsResult> {
  const supabase = createPagesBrowserClient();

  const { data: listingRow, error: fetchError } = await supabase
    .from('listings')
    .select('metadata')
    .eq('id', vehicleId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const metadata = {
    ...(listingRow?.metadata || {}),
    specs,
  };

  const { error: updateError } = await supabase
    .from('listings')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', vehicleId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function saveVehicleFeatures(vehicleId: string, featureCodes: string[]): Promise<SaveSpecsResult> {
  const supabase = createPagesBrowserClient();
  const payload = {
    listing_id: vehicleId,
    features: featureCodes,
  };

  const { error } = await supabase
    .from('listings_vehicles')
    .upsert(payload, { onConflict: 'listing_id' });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}


