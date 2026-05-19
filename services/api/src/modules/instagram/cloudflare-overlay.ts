import { logger } from '@simple/logger';
import type { InstagramTemplateView as InstagramRenderTemplate } from './templates.js';

export type CloudflareOverlayListing = {
    id: string;
    vertical: string;
    title: string;
    price: string;
    location: string;
};

export type PrepareCloudflareInstagramImageDeps = {
    extractListingMediaUrls: (listing: CloudflareOverlayListing) => string[];
    prepareInstagramImageUrl: (
        listing: CloudflareOverlayListing,
        index: number,
        options: {
            layoutVariant?: 'square' | 'portrait' | null;
            template?: InstagramRenderTemplate | null;
            publishKey?: string | null;
            isCover?: boolean;
        },
    ) => Promise<string>;
    getStorageProvider: () => { constructor: { name: string } };
};

/** Genera URL de overlay vía Cloudflare Worker; fallback a Sharp/R2 si no aplica. */
export async function prepareInstagramImageUrlCloudflare(
    listing: CloudflareOverlayListing,
    deps: PrepareCloudflareInstagramImageDeps,
    index = 0,
    options: {
        layoutVariant?: 'square' | 'portrait' | null;
        template?: InstagramRenderTemplate | null;
        publishKey?: string | null;
        isCover?: boolean;
    } = {},
): Promise<string> {
    const images = deps.extractListingMediaUrls(listing);
    const rawUrl = images[index];
    if (!rawUrl) throw new Error('La publicación no tiene imágenes en el índice solicitado.');

    const storageProvider = deps.getStorageProvider();
    const isCloudflare = storageProvider.constructor.name === 'CloudflareR2Provider';

    if (!isCloudflare || !process.env.CLOUDFLARE_WORKER_URL) {
        return deps.prepareInstagramImageUrl(listing, index, options);
    }

    if (rawUrl.includes('backblazeb2.com') || rawUrl.includes('f005.backblazeb2.com')) {
        logger.info('[instagram] imagen en Backblaze detectada, usando método tradicional con Sharp');
        return deps.prepareInstagramImageUrl(listing, index, options);
    }

    const effectiveLayoutVariant = options.layoutVariant ?? options.template?.layoutVariant ?? 'square';
    const targetHeight = effectiveLayoutVariant === 'portrait' ? 1350 : 1080;
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL.replace(/\/$/, '');

    let sourceUrl = rawUrl;
    if (rawUrl.includes('/api/media/proxy')) {
        try {
            const urlObj = new URL(rawUrl);
            const srcParam = urlObj.searchParams.get('src');
            if (srcParam) {
                sourceUrl = decodeURIComponent(srcParam);
            }
        } catch {
            // ignore
        }
    }

    let directImageUrl: string;
    if (sourceUrl.includes('r2.cloudflarestorage.com') || sourceUrl.includes('.r2.dev')) {
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const sourceKey = pathParts.join('/');
        const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
        directImageUrl = `${r2PublicUrl}/${sourceKey}`;
    } else if (sourceUrl.includes('backblazeb2.com')) {
        directImageUrl = sourceUrl;
    } else {
        directImageUrl = sourceUrl;
    }

    const overlayData = {
        title: options.template?.title || listing.title,
        price: options.template?.priceLabel || listing.price || 'Consultar',
        location: options.template?.locationLabel || listing.location || 'Chile',
        highlights: options.template?.highlights || [],
        badges: options.template?.badges || [],
        brand: options.template?.branding?.appId || (listing.vertical === 'propiedades' ? 'simplepropiedades' : 'simpleautos'),
    };

    let variant: 'essential-watermark' | 'professional-centered' | 'signature-complete' | 'property-conversion';
    if (!options.template) {
        variant = 'essential-watermark';
    } else {
        const overlayVariant = options.template.overlayVariant;
        if (overlayVariant === 'professional-centered') variant = 'professional-centered';
        else if (overlayVariant === 'signature-complete') variant = 'signature-complete';
        else if (overlayVariant.startsWith('property')) variant = 'property-conversion';
        else variant = 'essential-watermark';
    }

    const params = new URLSearchParams({
        image: directImageUrl,
        variant,
        data: JSON.stringify(overlayData),
        width: '1080',
        height: targetHeight.toString(),
    });

    const overlayUrl = `${workerUrl}/overlay?${params.toString()}`;

    logger.info('[instagram] usando Cloudflare Worker', {
        listingId: listing.id,
        imageIndex: index,
        workerUrl: `${overlayUrl.substring(0, 100)}...`,
    });

    return overlayUrl;
}
