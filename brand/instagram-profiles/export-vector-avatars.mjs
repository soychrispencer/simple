import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getSimpleBrandIconSvg } = require('../../packages/config/dist/index.js');

const SIZE = 2048;
const OUT = fileURLToPath(new URL('.', import.meta.url));
/** Framed rounded tile as fraction of canvas (IG-safe). */
const FRAME_TILE_RATIO = 0.70;

const APPS = [
    { id: 'simpleautos', accent: '#E84A1F', glyph: '#FFFFFF' },
    { id: 'simplepropiedades', accent: '#4F46E5', glyph: '#FFFFFF' },
    { id: 'simpleagenda', accent: '#0F766E', glyph: '#FFFFFF' },
    { id: 'simpleserenatas', accent: '#E11D48', glyph: '#FFFFFF' },
    { id: 'simpletickets', accent: '#0E7490', glyph: '#FFFFFF' },
    { id: 'simpleresto', accent: '#F4B400', glyph: '#111111' },
    { id: 'simpleplataforma', accent: '#111111', glyph: '#FFFFFF' },
    { id: 'simpleadmin', accent: '#111111', glyph: '#FFFFFF' },
];

const DARK = '#0C0C0E';

function brandSvg(app, { square = false } = {}) {
    let svg = getSimpleBrandIconSvg(app.id);
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
    await writeFile(out, png);
    return out;
}

async function makeFramed(app) {
    const tile = Math.round(SIZE * FRAME_TILE_RATIO);
    const left = Math.round((SIZE - tile) / 2);
    const top = left;
    const nestedSvg = brandSvg(app).replace('<svg ', `<svg x="${left}" y="${top}" `)
        .replace('width="512" height="512"', `width="${tile}" height="${tile}"`);
    const out = join(OUT, `ig-profile-framed-${app.id}.png`);

    await writeFile(out, renderSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${DARK}"/>${nestedSvg}</svg>`, SIZE));

    return { out, tile };
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
