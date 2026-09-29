/**
 * Assets — atmósfera anclada al hero + hero limpio con sombras unificadas
 */
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, 'assets');
mkdirSync(dir, { recursive: true });
const require = createRequire(import.meta.url);
const { getSimpleBrandIconSvg } = require('../../../../../packages/config/dist/index.js');
const BG = '#F7F7F5';

const svg = getSimpleBrandIconSvg('simplepropiedades');
writeFileSync(join(dir, 'logo-door.svg'), svg);
await sharp(Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng()))
    .png()
    .toFile(join(dir, 'logo-door.png'));

/** Limpia placa blanca/negra y halo en bordes (no toca blancos/negros del UI) */
async function cleanFringe(inputPath) {
    const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const idx = (x, y) => (y * w + x) * 4;
    const isPlateColor = (i) => {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 12) return true;
        const lum = (r + g + b) / 3;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum > 232 && chroma < 18) return true; // placa clara
        if (lum < 18 && chroma < 16) return true; // placa negra pura (protege bezels/card)
        return false;
    };
    // Pase 1: marcar placa connected al borde (flood desde bordes)
    const plate = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
        const p = y * w + x;
        if (plate[p]) return;
        const i = p * 4;
        if (!isPlateColor(i)) return;
        plate[p] = 1;
        stack.push(p);
    };
    for (let x = 0; x < w; x++) {
        push(x, 0);
        push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
        push(0, y);
        push(w - 1, y);
    }
    while (stack.length) {
        const p = stack.pop();
        const x = p % w;
        const y = (p - x) / w;
        if (x > 0) push(x - 1, y);
        if (x < w - 1) push(x + 1, y);
        if (y > 0) push(x, y - 1);
        if (y < h - 1) push(x, y + 1);
    }
    const out = Buffer.from(data);
    for (let p = 0; p < plate.length; p++) {
        if (plate[p]) out[p * 4 + 3] = 0;
    }
    // Pase 2: halo residual cerca de transparente
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = idx(x, y);
            if (out[i + 3] < 12) continue;
            if (!isPlateColor(i)) continue;
            let nearClear = false;
            for (let dy = -2; dy <= 2 && !nearClear; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
                        nearClear = true;
                        break;
                    }
                    if (out[idx(nx, ny) + 3] < 40) {
                        nearClear = true;
                        break;
                    }
                }
            }
            if (nearClear) out[i + 3] = 0;
        }
    }
    return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer({ resolveWithObject: true });
}

// Hero: versión transparente del usuario + fringe clean + sombra unificada
const srcHero = join(__dirname, '../heroes/hero-publica-gratis-v2.png');
const cleaned = await cleanFringe(srcHero);
const trimmed = await sharp(cleaned.data)
    .trim({ threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });

const padX = 24;
const padY = 36;
const cw = trimmed.info.width + padX * 2;
const ch = trimmed.info.height + padY * 2;

// Una sola familia de sombras (misma luz, mismo blur)
const shadows = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="s2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <ellipse cx="${cw * 0.48}" cy="${ch * 0.93}" rx="${cw * 0.38}" ry="${ch * 0.055}" fill="rgba(15,23,42,0.22)" filter="url(#s1)"/>
  <ellipse cx="${cw * 0.42}" cy="${ch * 0.90}" rx="${cw * 0.22}" ry="${ch * 0.035}" fill="rgba(15,23,42,0.16)" filter="url(#s2)"/>
  <ellipse cx="${cw * 0.62}" cy="${ch * 0.91}" rx="${cw * 0.18}" ry="${ch * 0.03}" fill="rgba(15,23,42,0.14)" filter="url(#s2)"/>
</svg>`;

await sharp({
    create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
    .composite([
        { input: Buffer.from(shadows), top: 0, left: 0 },
        { input: trimmed.data, top: padY, left: padX },
    ])
    .png()
    .toFile(join(dir, 'hero-publica-gratis.png'));

function dots(ox, oy, cols, rows, gap, opacity) {
    let out = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            out += `<circle cx="${ox + c * gap}" cy="${oy + r * gap}" r="2.4" fill="#4F46E5" opacity="${opacity}"/>`;
        }
    }
    return out;
}

/** Atmósfera: blobs + orbe anclado a zona del hero (abajo-derecha) */
function atmosphereSvg(w, h) {
    const heroY = h * 0.72;
    const heroX = w * 0.78;
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="52"/></filter>
    <filter id="softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="78"/></filter>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A5B4FC" stop-opacity="0.62"/>
      <stop offset="40%" stop-color="#6366F1" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="wash" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#F7F7F5" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <ellipse cx="${w * -0.02}" cy="${h * 0.06}" rx="${w * 0.58}" ry="${h * 0.2}" fill="#4F46E5" opacity="0.2" filter="url(#softer)"/>
  <ellipse cx="${w * 1.05}" cy="${h * 0.1}" rx="${w * 0.5}" ry="${h * 0.18}" fill="#6366F1" opacity="0.22" filter="url(#softer)"/>
  <ellipse cx="${w * 0.12}" cy="${h * 0.42}" rx="${w * 0.4}" ry="${h * 0.14}" fill="#818CF8" opacity="0.16" filter="url(#soft)"/>
  <!-- orbe detrás del hero (edificio) -->
  <circle cx="${heroX}" cy="${heroY}" r="${Math.min(w, h) * 0.26}" fill="url(#orb)"/>
  <ellipse cx="${w * 0.72}" cy="${h * 0.68}" rx="${w * 0.42}" ry="${h * 0.16}" fill="#4F46E5" opacity="0.2" filter="url(#soft)"/>
  <ellipse cx="${w * 0.28}" cy="${h * 0.92}" rx="${w * 0.48}" ry="${h * 0.16}" fill="#6366F1" opacity="0.18" filter="url(#softer)"/>
  <rect width="${w}" height="${h}" fill="url(#wash)"/>
  ${dots(24, h * 0.34, 5, 10, 16, 0.28)}
  ${dots(w - 24 - 4 * 16, h * 0.16, 5, 8, 16, 0.26)}
  ${dots(32, h * 0.78, 4, 5, 15, 0.2)}
</svg>`;
}

await sharp(Buffer.from(atmosphereSvg(1080, 1920))).png().toFile(join(dir, 'bg-story.png'));
await sharp(Buffer.from(atmosphereSvg(1080, 1350))).png().toFile(join(dir, 'bg-post.png'));

await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14l11-11"/><path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1L21 3"/></svg>`))
    .png()
    .toFile(join(dir, 'icon-send.png'));
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>`))
    .png()
    .toFile(join(dir, 'icon-globe.png'));

const meta = await sharp(join(dir, 'hero-publica-gratis.png')).metadata();
console.log('assets ready', { hero: `${meta.width}x${meta.height}` });
