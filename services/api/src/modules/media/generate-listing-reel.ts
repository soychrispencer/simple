import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { isFfmpegAvailable, resolveFfmpegPath } from '../../lib/ffmpeg-path.js';
import { asObject } from '../shared/helpers.js';

const execFileAsync = promisify(execFile);

const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
const SECONDS_PER_SLIDE = 2.5;
const FPS = 30;

export function isReelGeneratorAvailable(): boolean {
    return isFfmpegAvailable();
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function createListingReelTitleCard(title: string, price: string): Promise<Buffer> {
    const safeTitle = escapeXml(title.trim().slice(0, 80) || 'Tu vehículo');
    const safePrice = escapeXml(price.trim().slice(0, 40) || '');
    const svg = `
<svg width="${REEL_WIDTH}" height="${REEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="46%" text-anchor="middle" fill="#ffffff" font-size="58" font-family="Arial, Helvetica, sans-serif" font-weight="700">${safeTitle}</text>
  ${safePrice ? `<text x="50%" y="54%" text-anchor="middle" fill="#fbbf24" font-size="52" font-family="Arial, Helvetica, sans-serif" font-weight="700">${safePrice}</text>` : ''}
  <text x="50%" y="62%" text-anchor="middle" fill="#94a3b8" font-size="34" font-family="Arial, Helvetica, sans-serif">Disponible en SimpleAutos</text>
</svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

async function downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
        throw new Error(`No se pudo descargar una foto (${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function renderSlideshowMp4(slidePaths: string[], outputPath: string, ffmpeg = resolveFfmpegPath() ?? undefined): Promise<void> {
    if (!ffmpeg) throw new Error('FFmpeg no está disponible.');

    const slideCount = slidePaths.length;
    const inputArgs: string[] = [];
    for (const slidePath of slidePaths) {
        inputArgs.push('-loop', '1', '-t', String(SECONDS_PER_SLIDE), '-i', slidePath);
    }

    const filters: string[] = [];
    for (let index = 0; index < slideCount; index += 1) {
        filters.push(
            `[${index}:v]scale=${REEL_WIDTH}:${REEL_HEIGHT}:force_original_aspect_ratio=increase,crop=${REEL_WIDTH}:${REEL_HEIGHT},setsar=1,fps=${FPS}[v${index}]`,
        );
    }
    filters.push(`${Array.from({ length: slideCount }, (_, index) => `[v${index}]`).join('')}concat=n=${slideCount}:v=1:a=0[vout]`);

    await execFileAsync(ffmpeg, [
        '-y',
        ...inputArgs,
        '-filter_complex',
        filters.join(';'),
        '-map',
        '[vout]',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputPath,
    ], { maxBuffer: 64 * 1024 * 1024 });
}

export function attachGeneratedVideoToListing<T extends { rawData?: unknown; videoUrl?: string | null; updatedAt?: number }>(
    listing: T,
    videoUrl: string,
    sizeBytes: number,
): T {
    const rawData = asObject(listing.rawData);
    const media = asObject(rawData.media);
    const videoMeta = {
        id: randomUUID(),
        name: 'reel-generado.mp4',
        dataUrl: videoUrl,
        previewUrl: videoUrl,
        mimeType: 'video/mp4',
        sizeBytes,
        generated: true,
    };

    return {
        ...listing,
        rawData: {
            ...rawData,
            media: {
                ...media,
                videoUrl,
                discoverVideo: videoMeta,
            },
        },
        videoUrl,
        updatedAt: Date.now(),
    };
}

export async function generateListingReelVideo(input: {
    title: string;
    price: string;
    imageUrls: string[];
    upload: (file: Buffer, fileName: string) => Promise<{ publicUrl: string }>;
}): Promise<{ publicUrl: string; sizeBytes: number; durationSeconds: number; slideCount: number }> {
    if (!isReelGeneratorAvailable()) {
        throw new Error('El generador de video no está disponible en este servidor.');
    }

    const images = input.imageUrls
        .map((url) => url.trim())
        .filter((url) => url.startsWith('http'))
        .slice(0, 8);

    if (images.length < 2) {
        throw new Error('Se necesitan al menos 2 fotos públicas en el aviso para generar el video.');
    }

    const workDir = join(tmpdir(), `simple-reel-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });

    try {
        const slidePaths: string[] = [];
        const titlePath = join(workDir, '00-title.png');
        await writeFile(titlePath, await createListingReelTitleCard(input.title, input.price));
        slidePaths.push(titlePath);

        let index = 1;
        for (const url of images) {
            const buffer = await downloadImage(url);
            const normalized = await sharp(buffer)
                .resize(REEL_WIDTH, REEL_HEIGHT, { fit: 'cover' })
                .jpeg({ quality: 85 })
                .toBuffer();
            const slidePath = join(workDir, `${String(index).padStart(2, '0')}-slide.jpg`);
            await writeFile(slidePath, normalized);
            slidePaths.push(slidePath);
            index += 1;
        }

        const outputPath = join(workDir, 'reel.mp4');
        await renderSlideshowMp4(slidePaths, outputPath);
        const videoBuffer = await readFile(outputPath);
        const upload = await input.upload(videoBuffer, `reel-${randomUUID()}.mp4`);

        return {
            publicUrl: upload.publicUrl,
            sizeBytes: videoBuffer.length,
            durationSeconds: slidePaths.length * SECONDS_PER_SLIDE,
            slideCount: slidePaths.length,
        };
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
