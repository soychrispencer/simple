import type { Metadata } from 'next';
import { getSimpleApiBaseUrl } from '@simple/config';
import { getListingById, getListingMedia } from '@simple/sdk';

function getAppOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://simpleautos.app';
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin;
  } catch {
    return 'https://simpleautos.app';
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

  // 2) Relativa al sitio
  try {
    return new URL(input.startsWith('/') ? input : `/${input}`, origin).toString();
  } catch {
    return origin;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const origin = getAppOrigin();
  const { id } = await params;

  let title = 'Vehículo | SimpleAutos';
  let description = 'Publica y encuentra vehículos en SimpleAutos.';
  let imageUrl = toAbsoluteUrl('/brand/logo.png', origin);

  try {
    if (id) {
      let resolvedViaSimpleApi = false;

      if (getSimpleApiBaseUrl()) {
        try {
          const { item } = await getListingById(id);
          if (item?.vertical === 'autos') {
            const rawTitle = safeText(item?.title, 90);
            if (rawTitle) title = `${rawTitle} | SimpleAutos`;

            const rawDesc = safeText(item?.description, 180);
            if (rawDesc) description = rawDesc;

            const mediaPayload = await getListingMedia(id).catch(() => ({ items: [] as any[] }));
            const imageEntries = Array.isArray(mediaPayload.items)
              ? mediaPayload.items
                  .filter((entry: any) => entry?.kind === 'image' && typeof entry?.url === 'string')
                  .sort((a: any, b: any) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
                  .map((entry: any) => String(entry.url))
              : [];

            const primary = imageEntries[0] || item?.imageUrl || null;
            if (primary) {
              imageUrl = toAbsoluteUrl(primary, origin);
            }
            resolvedViaSimpleApi = true;
          }
        } catch {
          // fallback silencioso al backend legacy
        }
      }

      if (!resolvedViaSimpleApi) {
        imageUrl = toAbsoluteUrl('/brand/logo.png', origin);
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
