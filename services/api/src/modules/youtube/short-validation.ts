import { asObject } from '../shared/helpers.js';

export const YOUTUBE_SHORT_MAX_BYTES = 50 * 1024 * 1024;
export const YOUTUBE_SHORT_MAX_DURATION_SECONDS = 60;

export type YouTubeShortValidationResult =
    | { ok: true }
    | { ok: false; error: string };

export function readListingVideoDurationSeconds(rawData: unknown): number | null {
    const media = asObject(asObject(rawData).media);
    const discoverVideo = asObject(media.discoverVideo);
    const duration = discoverVideo.durationSeconds;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        return duration;
    }
    return null;
}

export function validateYouTubeShortVideoBuffer(
    buffer: Buffer,
    durationSeconds?: number | null,
): YouTubeShortValidationResult {
    if (buffer.length > YOUTUBE_SHORT_MAX_BYTES) {
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
        return {
            ok: false,
            error: `El video pesa ${sizeMb} MB. YouTube Shorts admite hasta 50 MB.`,
        };
    }

    if (
        typeof durationSeconds === 'number'
        && Number.isFinite(durationSeconds)
        && durationSeconds > YOUTUBE_SHORT_MAX_DURATION_SECONDS + 0.25
    ) {
        return {
            ok: false,
            error: `El video dura ${Math.ceil(durationSeconds)} s. YouTube Shorts admite hasta ${YOUTUBE_SHORT_MAX_DURATION_SECONDS} segundos.`,
        };
    }

    return { ok: true };
}

export function youTubeCategoryIdForVertical(vertical: string): string {
    if (vertical === 'autos') return '2';
    if (vertical === 'propiedades') return '19';
    return '22';
}

export function buildYouTubeShortTitle(title: string): string {
    const trimmed = title.trim().slice(0, 90);
    if (!trimmed) return '#Shorts';
    return trimmed.includes('#Shorts') || trimmed.includes('#shorts')
        ? trimmed
        : `${trimmed} #Shorts`.slice(0, 100);
}

export function buildYouTubeShortDescription(description: string): string {
    const trimmed = description.trim();
    if (!trimmed) return '#Shorts';
    return trimmed.includes('#Shorts') || trimmed.includes('#shorts')
        ? trimmed.slice(0, 4900)
        : `${trimmed}\n\n#Shorts`.slice(0, 4900);
}
