/**
 * Geocodificación server-side para direcciones de serenatas (Chile).
 * - Preferencia: Google Geocoding API si `GOOGLE_MAPS_API_KEY` está definida.
 * - Respaldo: Nominatim (OSM); uso moderado y solo desde servidor (política OSM).
 */

function buildQueryParts(input: {
  address: string;
  city?: string | null;
  region?: string | null;
}): string {
  const parts = [
    input.address.trim(),
    input.city?.trim(),
    input.region?.trim(),
    'Chile',
  ].filter(Boolean);
  return parts.join(', ');
}

async function geocodeGoogle(fullQuery: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', fullQuery);
  url.searchParams.set('key', key);
  url.searchParams.set('region', 'cl');

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
    return null;
  }

  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

async function geocodeNominatim(fullQuery: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', fullQuery);

  const ua =
    process.env.SERENATAS_OSM_USER_AGENT?.trim() ||
    'SimpleSerenatas/1.0 (+https://simpleplataforma.app; geocode service)';

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': ua,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const first = rows?.[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

/**
 * Devuelve coordenadas WGS84 o null si no hay proveedor / falla la búsqueda.
 */
export async function geocodeChileAddress(input: {
  address: string;
  city?: string | null;
  region?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const q = buildQueryParts(input);
  if (!input.address.trim()) return null;

  const google = await geocodeGoogle(q).catch(() => null);
  if (google) return google;

  return geocodeNominatim(q).catch(() => null);
}
