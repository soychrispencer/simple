import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { logger } from '@simple/logger';
import { asObject, asString } from '../shared/index.js';
import { isLocalHostname } from '../mercadopago/checkout-helpers.js';
import { getInstagramPublicApiOrigin } from './service.js';
import { buildInstagramTemplateOverlaySvg, getInstagramWatermarkLogoPlacement } from './svg-render.js';
import type { ListingData as InstagramListingData, InstagramTemplateView as InstagramRenderTemplate } from './templates.js';

const API_ROOT_DIR = path.resolve(__dirname, '../../..');

export type VerticalType = 'autos' | 'propiedades';

export type InstagramListingSource = {
    id: string;
    vertical: VerticalType;
    title: string;
    price: string;
    description: string;
    location: string;
    section?: string | null;
    href: string;
    locationData?: { communeName?: string } | null;
    rawData?: unknown;
};

export type InstagramListingPresentationDeps = {
    extractListingSummary: (listing: InstagramListingSource) => string[];
    extractListingMediaUrls: (listing: InstagramListingSource) => string[];
    parseNumberFromString: (value: unknown) => number | null;
    listingDefaultHref: (vertical: VerticalType, listingId: string) => string;
    getR2S3Client: () => S3Client | null;
    extractStorageObjectKey: (url: string) => string;
};

const INSTAGRAM_BRAND_LOGO_PATHS: Record<'simpleautos' | 'simplepropiedades', string> = {
    simpleautos: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simpleautos', 'public', 'logo.png'),
    simplepropiedades: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simplepropiedades', 'public', 'logo.png'),
};

const INSTAGRAM_BRAND_LOGO_LIGHT_PATHS: Record<'simpleautos' | 'simplepropiedades', string> = {
    simpleautos: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simpleautos', 'public', 'logo-light.png'),
    simplepropiedades: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simplepropiedades', 'public', 'logo-light.png'),
};

export function defaultInstagramCaptionTemplate(vertical: string): string {
    if (vertical === 'autos') {
        return '🚗 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimpleAutos #AutosChile #Autos #VentaAutos';
    }
    if (vertical === 'propiedades') {
        return '🏠 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimplePropiedades #PropiedadesChile #Inmobiliaria';
    }
    return '{{title}}\n{{price}}\n{{location}}\n\n{{description}}\n\n{{url}}';
}

export function formatInstagramMoneyLabel(value: number | null | undefined): string | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}

export function getInstagramCommuneLabel(
    listing: InstagramListingSource,
    rawData: Record<string, unknown>,
): string | undefined {
    const locationData = asObject(rawData.locationData);
    const nestedLocation = asObject(rawData.location);
    const directCommune =
        asString(listing.locationData?.communeName)
        || asString(locationData.communeName)
        || asString(nestedLocation.communeName);

    if (directCommune) return directCommune;

    const locationParts = (listing.location || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (locationParts.length >= 3) return locationParts[1];
    if (locationParts.length >= 1) return locationParts[0];
    return undefined;
}

export function buildInstagramListingData(
    listing: InstagramListingSource,
    deps: InstagramListingPresentationDeps,
): InstagramListingData {
    const rawData = asObject(listing.rawData);
    const basic = asObject(rawData.basic);
    const commercial = asObject(rawData.commercial);
    const setup = asObject(rawData.setup);
    const basePrice = deps.parseNumberFromString(listing.price)
        ?? deps.parseNumberFromString(rawData.price)
        ?? deps.parseNumberFromString(commercial.price)
        ?? undefined;
    const offerPrice = deps.parseNumberFromString(commercial.offerPrice) ?? undefined;
    const discountPercent = basePrice && offerPrice && offerPrice < basePrice
        ? Math.round(((basePrice - offerPrice) / basePrice) * 100)
        : null;
    const mileageKm = deps.parseNumberFromString(basic.mileage) ?? undefined;

    return {
        id: listing.id,
        vertical: listing.vertical,
        title: listing.title,
        price: basePrice ?? undefined,
        offerPrice: offerPrice ?? undefined,
        priceLabel: formatInstagramMoneyLabel(basePrice) || listing.price,
        offerPriceLabel: formatInstagramMoneyLabel(offerPrice),
        discountLabel: discountPercent && discountPercent > 0 ? `-${discountPercent}%` : undefined,
        brand: asString(basic.brand) || asString(rawData.brand) || undefined,
        model: asString(basic.model) || asString(rawData.model) || undefined,
        year: deps.parseNumberFromString(basic.year) ?? deps.parseNumberFromString(rawData.year) ?? undefined,
        category: asString(basic.bodyType) || asString(basic.propertyType) || asString(rawData.category) || undefined,
        condition: asString(basic.condition) || asString(rawData.condition) || undefined,
        mileageKm: mileageKm ?? undefined,
        mileageLabel: mileageKm != null ? `${mileageKm.toLocaleString('es-CL')} km` : undefined,
        fuelType: asString(basic.fuelType) || undefined,
        transmission: asString(basic.transmission) || undefined,
        negotiable: commercial.negotiable === true,
        financingAvailable: commercial.financingAvailable === true,
        exchangeAvailable: commercial.exchangeAvailable === true,
        propertyType: asString(basic.propertyType) || undefined,
        rooms: deps.parseNumberFromString(basic.rooms) ?? undefined,
        bathrooms: deps.parseNumberFromString(basic.bathrooms) ?? undefined,
        surfaceLabel: (() => {
            const surface = deps.parseNumberFromString(basic.totalArea) ?? deps.parseNumberFromString(basic.surface);
            return surface != null ? `${surface.toLocaleString('es-CL')} m²` : undefined;
        })(),
        features: deps.extractListingSummary(listing),
        images: deps.extractListingMediaUrls(listing).map((url) => ({ url })),
        location: getInstagramCommuneLabel(listing, rawData) || listing.location || undefined,
        description: listing.description || '',
        section: asString(setup.operationType) || listing.section || undefined,
        summary: deps.extractListingSummary(listing),
    };
}

export function buildInstagramCaption(
    listing: InstagramListingSource,
    publicUrl: string,
    template: string | null,
    override: string | null,
    deps: InstagramListingPresentationDeps,
): string {
    if (override) return override.trim();

    const summary = deps.extractListingSummary(listing).join(' · ');
    const locationLabel = getInstagramCommuneLabel(listing, asObject(listing.rawData)) || listing.location || 'Chile';
    const source = (template && template.trim()) || defaultInstagramCaptionTemplate(listing.vertical);
    return source
        .replaceAll('{{title}}', listing.title)
        .replaceAll('{{price}}', listing.price || 'Consultar precio')
        .replaceAll('{{location}}', locationLabel)
        .replaceAll('{{description}}', listing.description || '')
        .replaceAll('{{summary}}', summary)
        .replaceAll('{{url}}', publicUrl)
        .replaceAll('{{vertical}}', listing.vertical === 'autos' ? 'SimpleAutos' : 'SimplePropiedades')
        .trim()
        .slice(0, 2200);
}

export function getInstagramBasePublicOrigin(): string {
    const origin = getInstagramPublicApiOrigin();
    if (!origin) {
        throw new Error('INSTAGRAM_REDIRECT_URI debe apuntar a una URL pública del API.');
    }

    const url = new URL(origin);
    if (url.protocol !== 'https:' || isLocalHostname(url.hostname)) {
        throw new Error('Instagram requiere un API público HTTPS para servir imágenes.');
    }
    return url.origin;
}

export function buildListingPublicUrlForInstagram(
    listing: InstagramListingSource,
    listingDefaultHref: (vertical: VerticalType, listingId: string) => string,
): string {
    const baseOrigin = getInstagramBasePublicOrigin();
    if (/^https?:\/\//i.test(listing.href)) {
        const target = new URL(listing.href);
        if (target.protocol !== 'https:' || isLocalHostname(target.hostname)) {
            throw new Error('La URL pública del aviso debe ser HTTPS y accesible desde Internet.');
        }
        return target.toString();
    }

    return new URL(listing.href || listingDefaultHref(listing.vertical, listing.id), baseOrigin).toString();
}

async function getInstagramBrandLogoBuffer(appId: 'simpleautos' | 'simplepropiedades'): Promise<Buffer | null> {
    try {
        return await fs.readFile(INSTAGRAM_BRAND_LOGO_PATHS[appId]);
    } catch {
        return null;
    }
}

async function getInstagramBrandLogoLightBuffer(appId: 'simpleautos' | 'simplepropiedades'): Promise<Buffer | null> {
    try {
        return await fs.readFile(INSTAGRAM_BRAND_LOGO_LIGHT_PATHS[appId]);
    } catch {
        return null;
    }
}

/** Prepara una imagen JPEG en Cloudflare R2 para Instagram. */
export async function prepareInstagramImageUrl(
    listing: InstagramListingSource,
    deps: InstagramListingPresentationDeps,
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

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';
    const effectiveLayoutVariant = options.layoutVariant ?? options.template?.layoutVariant ?? 'square';
    const targetHeight = effectiveLayoutVariant === 'portrait' ? 1350 : 1080;

    const templateSuffix = options.template ? `-${options.template.id}` : '';
    const publishKey = options.publishKey?.trim() || randomUUID();
    const assetLabel = options.isCover ? 'cover' : `gallery-${index}`;
    const destKey = `instagram-ready/${listing.id}/${publishKey}-${assetLabel}${templateSuffix}-${targetHeight}.jpg`;
    const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
    const directUrl = `${r2PublicUrl}/${destKey}`;

    const client = deps.getR2S3Client();
    if (!client) throw new Error('Cloudflare R2 no configurado.');

    const sourceKey = deps.extractStorageObjectKey(rawUrl) || rawUrl.replace(/^https?:\/\/[^/]+\/file\/[^/]+\//, '');
    let rawBuffer: Buffer;
    try {
        const obj = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: sourceKey }));
        rawBuffer = obj.Body ? Buffer.from(await obj.Body.transformToByteArray()) : Buffer.alloc(0);
    } catch {
        const resp = await fetch(rawUrl);
        if (!resp.ok) throw new Error(`No se pudo descargar la imagen: ${rawUrl}`);
        rawBuffer = Buffer.from(await resp.arrayBuffer());
    }

    const sharp = require('sharp') as typeof import('sharp');
    let pipeline = sharp(rawBuffer)
        .rotate()
        .resize({ width: 1080, height: targetHeight, fit: 'cover' });

    if (options.template) {
        const overlayBuffer = await buildInstagramTemplateOverlaySvg(listing, options.template, 1080, targetHeight);
        const composites: Array<{ input: Buffer; top: number; left: number }> = [
            { input: overlayBuffer, top: 0, left: 0 },
        ];

        const variant = options.template.overlayVariant;
        const appId = options.template.branding.appId;
        const useLight = ['essential-watermark', 'professional-centered', 'signature-complete'].includes(variant);
        const logoBuffer = !appId ? null : useLight
            ? await getInstagramBrandLogoLightBuffer(appId)
            : await getInstagramBrandLogoBuffer(appId);
        if (logoBuffer) {
            let logoPlacement: { width: number; height: number; top: number; left: number; opacity?: number };
            if (variant === 'essential-watermark') {
                const watermark = getInstagramWatermarkLogoPlacement(1080, targetHeight);
                logoPlacement = { ...watermark.logo, opacity: 1 };
            } else if (variant === 'professional-centered') {
                const t = options.template;
                const hasOrigPrice = !!(t.offerPriceLabel && t.priceLabel);
                const hasTitle = !!(t.title);
                const hasHighlights = (t.highlights?.length ?? 0) > 0;
                const hasLocation = !!(t.locationLabel);
                let cardHeight = 56 + 72 + 28;
                if (hasOrigPrice) cardHeight += 24;
                if (hasTitle) cardHeight += 42;
                if (hasHighlights) cardHeight += 42;
                if (hasLocation) cardHeight += 52;
                cardHeight = Math.max(cardHeight, 250);
                const cardY = targetHeight - 40 - cardHeight;
                logoPlacement = { width: 56, height: 56, top: cardY + 14, left: Math.round(1080 / 2) - 118 };
            } else if (variant === 'signature-complete') {
                logoPlacement = { width: 72, height: 72, top: targetHeight - 380, left: (1080 - 72) / 2 };
            } else if (variant.startsWith('property')) {
                logoPlacement = { width: 48, height: 48, top: 34, left: 42 };
            } else {
                logoPlacement = { width: 50, height: 50, top: 30, left: 36 };
            }

            let logoOverlay = await sharp(logoBuffer)
                .resize({
                    width: logoPlacement.width,
                    height: logoPlacement.height,
                    fit: 'contain',
                    withoutEnlargement: false,
                })
                .ensureAlpha()
                .png()
                .toBuffer();

            if (logoPlacement.opacity != null && logoPlacement.opacity < 1) {
                const factor = logoPlacement.opacity;
                const { data, info } = await sharp(logoOverlay).raw().toBuffer({ resolveWithObject: true });
                for (let i = 3; i < data.length; i += 4) {
                    data[i] = Math.round(data[i] * factor);
                }
                logoOverlay = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
            }

            composites.push({
                input: logoOverlay,
                top: logoPlacement.top,
                left: logoPlacement.left,
            });
        }

        pipeline = pipeline.composite(composites);
    }

    const jpegBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();

    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: destKey,
        Body: new Uint8Array(jpegBuffer),
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=86400',
    }));

    logger.info('[instagram] uploaded to R2', {
        listingId: listing.id,
        imageIndex: index,
        isCover: options.isCover === true,
        templateId: options.template?.id ?? null,
        destKey,
        url: directUrl,
    });
    return directUrl;
}
