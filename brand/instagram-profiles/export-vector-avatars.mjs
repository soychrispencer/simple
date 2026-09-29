import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { getSimpleBrandIconSvg } = require('../../packages/config/dist/index.js');

const SIZE = 2048;
const OUT = 'C:/Users/chris/Desktop/Simple/brand/instagram-profiles';
/** Framed rounded tile as fraction of canvas (IG-safe). */
const FRAME_TILE_RATIO = 0.70;

const APPS = [
    { id: 'simpleautos', accent: '#E84A1F', glyph: '#FFFFFF' },
    { id: 'simplepropiedades', accent: '#4F46E5', glyph: '#FFFFFF' },
    { id: 'simpleagenda', accent: '#0F766E', glyph: '#FFFFFF' },
    { id: 'simpleserenatas', accent: '#E11D48', glyph: '#FFFFFF' },
    { id: 'simpletickets', accent: '#0E7490', glyph: '#FFFFFF' },
    { id: 'simpleresto', accent: '#F4B400', glyph: '#0C0C0E' },
];

const DARK = '#0C0C0E';

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function brandSvg(app, { square = false } = {}) {
    let svg = getSimpleBrandIconSvg(app.id);
    svg = svg.replace(/stroke="[^"]*"/g, `stroke="${app.glyph}"`);
    svg = svg.replace(/fill="#[0-9A-Fa-f]{3,8}"/, `fill="${app.accent}"`);
    if (square) {
        // Full-bleed: no rounded corners so IG circle is solid accent edge-to-edge.
        svg = svg.replace(/rx="[^"]*"/, 'rx="0"');
    }
    return svg;
}

function renderSvg(svg, width) {
    return new Resvg(svg, {
        fitTo: { mode: 'width', value: width },
        background: 'transparent',
        font: { loadSystemFonts: false },
    })
        .render()
        .asPng();
}

async function makeFullBleed(app) {
    // Native brand icon proportions at full canvas (glyph ~66% of tile).
    const png = renderSvg(brandSvg(app, { square: true }), SIZE);
    const out = join(OUT, `ig-profile-${app.id}.png`);
    await sharp(png).png({ compressionLevel: 9 }).toFile(out);
    return out;
}

async function makeFramed(app) {
    const tile = Math.round(SIZE * FRAME_TILE_RATIO);
    const tilePng = renderSvg(brandSvg(app, { square: false }), tile);
    const meta = await sharp(tilePng).metadata();
    const tw = meta.width ?? tile;
    const th = meta.height ?? tile;
    const left = Math.round((SIZE - tw) / 2);
    const top = Math.round((SIZE - th) / 2);
    const out = join(OUT, `ig-profile-framed-${app.id}.png`);

    await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(DARK) },
    })
        .composite([{ input: tilePng, left, top }])
        .png({ compressionLevel: 9 })
        .toFile(out);

    return { out, tile: tw };
}

async function main() {
    await mkdir(OUT, { recursive: true });
    console.log(`Vector export ${SIZE}x${SIZE} | frame tile ${FRAME_TILE_RATIO}`);

    for (const app of APPS) {
        await makeFullBleed(app);
        const framed = await makeFramed(app);
        console.log(`${app.id}: full + framed(${framed.tile}px) | ${app.accent} / glyph ${app.glyph}`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
