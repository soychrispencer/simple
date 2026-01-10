import { resolveSpecKey } from '@/components/vehicle-wizard/specDescriptors';
import { getSupabaseClient } from '@/lib/supabase/supabase';

interface LoadVehicleOptions {
  id: string;
}

// Retorna vehículo + specs desde el campo specs JSONB
export async function loadVehicleWithSpecs({ id }: LoadVehicleOptions) {
  const supabase = getSupabaseClient();
  
  // Cargar listing + detalle vehículo.
  // Importante: `listings` NO tiene relación directa con `vehicle_types`.
  // El join correcto es `listings -> listings_vehicles(vehicle_type_id) -> vehicle_types(id)`.
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select(`
      *,
      listings_vehicles(
        *,
        vehicle_types(name, slug, category)
      )
    `)
    .eq('id', id)
    .maybeSingle();
  if (listingErr) throw new Error(listingErr.message);
  if (!listing) return null;

  const metadata = (listing as any).metadata || {};
  const specs = metadata.specs || metadata.extra_specs || {};

  const vehicleRow = Array.isArray((listing as any).listings_vehicles)
    ? (listing as any).listings_vehicles[0]
    : (listing as any).listings_vehicles;

  // Preferimos el slug real desde vehicle_types; fallback a metadata.type_key; default car.
  const rawTypeSlug: string =
    vehicleRow?.vehicle_types?.slug ||
    vehicleRow?.type_slug ||
    metadata?.type_key ||
    'car';

  const resolved = resolveSpecKey(String(rawTypeSlug));

  // Extraer propiedades comunes del specs para acceso directo
  const listingWithExtractedProps = {
    ...(listing as any),
    // Datos del vehículo
    year: vehicleRow?.year,
    mileage: vehicleRow?.mileage,
    brand_id: vehicleRow?.brand_id ?? null,
    model_id: vehicleRow?.model_id ?? null,
    type_id: vehicleRow?.vehicle_type_id ?? metadata?.type_id ?? null,
    // Condición (Paso 2)
    condition: vehicleRow?.condition ?? null,
    state: vehicleRow?.state ?? null,
    color: specs.color || vehicleRow?.color || null,
    image_urls: Array.isArray(metadata?.gallery) ? metadata.gallery : [],
    metadata,

    // Compat/legacy: algunas publicaciones antiguas pueden tener campos de subasta dentro de metadata.
    auction_start_price: (listing as any).auction_start_price ?? metadata?.auction_start_price ?? null,
    auction_start_at: (listing as any).auction_start_at ?? metadata?.auction_start_at ?? null,
    auction_end_at: (listing as any).auction_end_at ?? metadata?.auction_end_at ?? null,
  };

  const features =
    metadata.features ||
    vehicleRow?.features ||
    specs.features ||
    [];

  return { vehicle: listingWithExtractedProps, specs, typeSlug: resolved, features };
}


