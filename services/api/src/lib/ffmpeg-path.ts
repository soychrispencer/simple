import { accessSync, constants, existsSync } from 'node:fs';
import ffmpegStaticPath from 'ffmpeg-static';

let cached: string | null | undefined;

function isUsableBinary(filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    try {
        accessSync(filePath, constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/** Ruta a FFmpeg: FFMPEG_BIN, binario de ffmpeg-static o null si no hay compresor. */
export function resolveFfmpegPath(): string | null {
    if (cached !== undefined) return cached;

    const envPath = process.env.FFMPEG_BIN?.trim();
    if (envPath && isUsableBinary(envPath)) {
        cached = envPath;
        return cached;
    }

    if (typeof ffmpegStaticPath === 'string' && isUsableBinary(ffmpegStaticPath)) {
        cached = ffmpegStaticPath;
        return cached;
    }

    cached = null;
    return null;
}

export function isFfmpegAvailable(): boolean {
    return resolveFfmpegPath() !== null;
}
