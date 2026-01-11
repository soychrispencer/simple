import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/serverSupabase';

function getAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || 'https://www.simpleautos.app';
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin;
  } catch {
    return 'https://www.simpleautos.app';
  }
}

function safeText(input: unknown, maxLen: number): string {
  const value = typeof input === 'string' ? input : '';
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed;
}

function toAbsoluteUrl(input: string, origin: string): string {
  if (!input) return origin;

  // 1) Absoluta
  try {
    return new URL(input).toString();
  } catch {
    // continue
  }

  // 2) Posible path de Supabase Storage (bucket vehicles)
  // Guardamos compatibilidad si en DB guardan solo el path.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const normalized = input.replace(/^\//, '');
    const bucketPrefix = 'vehicles/';
    const path = normalized.startsWith(bucketPrefix) ? normalized.slice(bucketPrefix.length) : normalized;
    if (path && /\.(webp|jpg|jpeg|png)$/i.test(path)) {
      try {
        const base = new URL(supabaseUrl);
        return new URL(`/storage/v1/object/public/vehicles/${path}`, base.origin).toString();
      } catch {
        // continue
      }
    }
  }

  // 3) Relativa al sitio
  try {
    return new URL(input.startsWith('/') ? input : `/${input}`, origin).toString();
  } catch {
    return origin;
  }
}

type ListingImage = { url: string; position: number | null; is_primary: boolean | null };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const origin = getAppOrigin();
  const { id } = await params;

  let title = 'Vehículo | SimpleAutos';
  let description = 'Publica y encuentra vehículos en SimpleAutos.';
  let imageUrl = toAbsoluteUrl('/favicon.png', origin);

  try {
    if (id) {
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, description, images(url, position, is_primary)')
        .eq('id', id)
        .limit(1);

      if (!error) {
        const listing = Array.isArray(data) ? (data[0] as any) : null;
        const rawTitle = safeText(listing?.title, 90);
        if (rawTitle) title = `${rawTitle} | SimpleAutos`;

        const rawDesc = safeText(listing?.description, 180);
        if (rawDesc) description = rawDesc;

        const images: ListingImage[] = Array.isArray(listing?.images) ? listing.images : [];
        const sorted = images
          .slice()
          .sort((a, b) => {
            const ap = a?.position ?? 9999;
            const bp = b?.position ?? 9999;
            return ap - bp;
          });
        const primary = images.find((img) => img?.is_primary) ?? sorted[0];
        if (primary?.url) {
          imageUrl = toAbsoluteUrl(primary.url, origin);
        }
      }
    }
  } catch {
    // fallback silencioso
  }

  const url = new URL(`/vehiculo/${id}`, origin);

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'SimpleAutos',
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function VehiculoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
