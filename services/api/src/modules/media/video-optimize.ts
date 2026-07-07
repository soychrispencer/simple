import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
    PUBLISH_VIDEO_MAX_BYTES,
    PUBLISH_VIDEO_MAX_DURATION_SECONDS,
} from '@simple/utils';
import { isFfmpegAvailable, resolveFfmpegPath } from '../../lib/ffmpeg-path.js';

const execFileAsync = promisify(execFile);

const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
const FPS = 30;

type EncodePass = {
    width: number;
    height: number;
    crf: number;
    audioBitrateKbps: number;
};

const ENCODE_PASSES: EncodePass[] = [
    { width: REEL_WIDTH, height: REEL_HEIGHT, crf: 28, audioBitrateKbps: 96 },
    { width: REEL_WIDTH, height: REEL_HEIGHT, crf: 32, audioBitrateKbps: 64 },
    { width: 720, height: 1280, crf: 32, audioBitrateKbps: 64 },
];

export function isVideoOptimizerAvailable(): boolean {
    return isFfmpegAvailable();
}

function baseName(originalName?: string): string {
    return originalName?.replace(/\.[^.]+$/, '').trim() || 'clip';
}

function buildVideoFilter(pass: EncodePass): string {
    return [
        `scale=${pass.width}:${pass.height}:force_original_aspect_ratio=increase`,
        `crop=${pass.width}:${pass.height}`,
        'setsar=1',
        `fps=${FPS}`,
    ].join(',');
}

async function encodeVideoPass(
    ffmpeg: string,
    inputPath: string,
    outputPath: string,
    pass: EncodePass,
): Promise<void> {
    await execFileAsync(ffmpeg, [
        '-y',
        '-i',
        inputPath,
        '-t',
        String(PUBLISH_VIDEO_MAX_DURATION_SECONDS),
        '-vf',
        buildVideoFilter(pass),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        String(pass.crf),
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        `${pass.audioBitrateKbps}k`,
        '-ar',
        '44100',
        '-movflags',
        '+faststart',
        outputPath,
    ], { maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Comprime un clip de publicación a MP4 vertical (9:16), H.264 y ≤60 s — estilo reel.
 */
export async function optimizeVideoForStorage(
    input: Buffer,
    originalName?: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    if (!isFfmpegAvailable()) {
        if (input.length > PUBLISH_VIDEO_MAX_BYTES) {
            throw new Error(
                `El video pesa ${(input.length / (1024 * 1024)).toFixed(1)} MB y no pudimos optimizarlo en el servidor.`,
            );
        }
        return {
            buffer: input,
            mimeType: 'video/mp4',
            fileName: originalName?.trim() || 'clip.mp4',
        };
    }

    const ffmpegPath = resolveFfmpegPath();
    if (!ffmpegPath) {
        throw new Error('FFmpeg no está disponible. Ejecuta pnpm run ensure:ffmpeg en la raíz del proyecto.');
    }

    const workDir = join(tmpdir(), `simple-video-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });
    const inputPath = join(workDir, 'input.bin');
    const outputPath = join(workDir, 'output.mp4');

    try {
        await writeFile(inputPath, input);

        let lastBuffer: Buffer | null = null;
        for (const pass of ENCODE_PASSES) {
            await encodeVideoPass(ffmpegPath, inputPath, outputPath, pass);
            lastBuffer = await readFile(outputPath);
            if (lastBuffer.length <= PUBLISH_VIDEO_MAX_BYTES) {
                return {
                    buffer: lastBuffer,
                    mimeType: 'video/mp4',
                    fileName: `${baseName(originalName)}.mp4`,
                };
            }
        }

        if (lastBuffer && lastBuffer.length > 0) {
            throw new Error(
                `No pudimos comprimir el video por debajo de ${(PUBLISH_VIDEO_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB. Prueba un clip más corto o de menor resolución.`,
            );
        }

        throw new Error('No se pudo procesar el video.');
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
