import sharp from 'sharp';

export type ImageUploadPurpose = 'avatar' | 'cover' | 'default';

export async function optimizeImageForStorage(
    input: Buffer,
    purpose: ImageUploadPurpose,
    originalName?: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    let pipeline = sharp(input, { failOn: 'none' }).rotate();

    if (purpose === 'avatar') {
        pipeline = pipeline.resize(512, 512, { fit: 'cover', withoutEnlargement: true });
    } else if (purpose === 'cover') {
        pipeline = pipeline.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true });
    } else {
        pipeline = pipeline.resize(2560, 2560, { fit: 'inside', withoutEnlargement: true });
    }

    const buffer = await pipeline.webp({ quality: 85, effort: 4 }).toBuffer();
    const base =
        originalName?.replace(/\.[^.]+$/, '')
        || (purpose === 'avatar' ? 'avatar' : purpose === 'cover' ? 'cover' : 'image');

    return {
        buffer,
        mimeType: 'image/webp',
        fileName: `${base}.webp`,
    };
}
