import { resolveSpecKey } from '@/components/vehicle-wizard/specDescriptors';

interface LoadVehicleOptions {
  id: string;
}

// Retorna vehículo + specs desde el campo specs JSONB
export async function loadVehicleWithSpecs({ id }: LoadVehicleOptions) {
  const params = new URLSearchParams({ id });
  const response = await fetch(`/api/vehicles/edit?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    throw new Error(String((payload as any)?.error || 'No se pudo cargar publicación para edición'));
  }

  const listing = (payload as any)?.listing || null;
  if (!listing) return null;

  const metadata = (listing as any).metadata || {};
  const specs = metadata.specs || metadata.extra_specs || {};

  const vehicleRow = Array.isArray((listing as any).listings_vehicles)
    ? (listing as any).listings_vehicles[0]
    : (listing as any).listings_vehicles;

  const rawTypeSlug: string =
    vehicleRow?.vehicle_types?.slug ||
    vehicleRow?.type_slug ||
    metadata?.type_key ||
    'car';

  const resolved = resolveSpecKey(String(rawTypeSlug));

  const listingWithExtractedProps = {
    ...(listing as any),
    year: vehicleRow?.year,
    mileage: vehicleRow?.mileage,
    brand_id: vehicleRow?.brand_id ?? null,
    model_id: vehicleRow?.model_id ?? null,
    type_id: vehicleRow?.vehicle_type_id ?? metadata?.type_id ?? null,
    condition: vehicleRow?.condition ?? null,
    state: vehicleRow?.state ?? null,
    color: specs.color || vehicleRow?.color || null,
    image_urls: Array.isArray(metadata?.gallery) ? metadata.gallery : [],
    metadata,
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
