import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(rootDir, 'services', 'api');
const require = createRequire(import.meta.url);

let ffmpegPkgDir;
try {
    ffmpegPkgDir = path.dirname(require.resolve('ffmpeg-static/package.json', { paths: [apiDir] }));
} catch {
    console.warn('[ensure-ffmpeg] ffmpeg-static no está instalado; omitiendo.');
    process.exit(0);
}

const executableName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const ffmpegPath = path.join(ffmpegPkgDir, executableName);

if (existsSync(ffmpegPath)) {
    console.log('[ensure-ffmpeg] FFmpeg listo.');
    process.exit(0);
}

console.log('[ensure-ffmpeg] Descargando FFmpeg (primera vez o binario faltante)…');
const installScript = path.join(ffmpegPkgDir, 'install.js');
const result = spawnSync(process.execPath, [installScript], { stdio: 'inherit', cwd: ffmpegPkgDir });

if (result.status !== 0 || !existsSync(ffmpegPath)) {
    console.error('[ensure-ffmpeg] No se pudo instalar FFmpeg. Revisa tu conexión o define FFMPEG_BIN en el API.');
    process.exit(result.status ?? 1);
}

console.log('[ensure-ffmpeg] FFmpeg instalado correctamente.');
