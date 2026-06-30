import sharp from 'sharp';
import { getSimpleBrandIconSvg, type SimpleAppId } from '@simple/config';

const APP_IDS: SimpleAppId[] = [
    'simpleserenatas',
    'simpleagenda',
    'simpleautos',
    'simplepropiedades',
    'simpleadmin',
    'simpleplataforma',
];

const pngBufferByApp: Partial<Record<SimpleAppId, Buffer>> = {};
let warmPromise: Promise<void> | null = null;

export function getEmailLogoContentId(appId: SimpleAppId): string {
    return `brand-logo-${appId}@simple`;
}

export type EmailLogoInlineAttachment = {
    filename: string;
    content: Buffer;
    cid: string;
    contentType: 'image/png';
    contentDisposition: 'inline';
};

async function rasterizeBrandIcon(appId: SimpleAppId): Promise<Buffer> {
    const svg = getSimpleBrandIconSvg(appId);
    return sharp(Buffer.from(svg, 'utf-8'))
        .resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
}

/** Precalienta PNG para correo (Gmail bloquea data: URIs; CID inline es fiable). */
export function warmEmailLogoCache(): Promise<void> {
    if (!warmPromise) {
        warmPromise = (async () => {
            await Promise.all(
                APP_IDS.map(async (appId) => {
                    pngBufferByApp[appId] = await rasterizeBrandIcon(appId);
                }),
            );
        })().catch((error) => {
            warmPromise = null;
            throw error;
        });
    }
    return warmPromise;
}

export function getEmailLogoInlineAttachment(appId: SimpleAppId): EmailLogoInlineAttachment | null {
    const content = pngBufferByApp[appId];
    if (!content) return null;
    return {
        filename: `${appId}-brand.png`,
        content,
        cid: getEmailLogoContentId(appId),
        contentType: 'image/png',
        contentDisposition: 'inline',
    };
}

/** Garantiza PNG antes de armar HTML (por si el arranque aún no precalentó). */
export async function ensureEmailLogoCache(): Promise<void> {
    if (APP_IDS.every((appId) => Boolean(pngBufferByApp[appId]))) return;
    await warmEmailLogoCache();
}
