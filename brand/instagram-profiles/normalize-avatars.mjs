import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SIZE = 1080;
const OUT = 'C:/Users/chris/Desktop/Simple/brand/instagram-profiles';
const AI_SRC = 'C:/Users/chris/.cursor/projects/c-Users-chris-Desktop-Simple/assets';

/**
 * Full-bleed / framed icon size is controlled by DIAGONAL ratio so landscape
 * tickets and tall receipts share the same visual weight inside a circle.
 */
const FULL_ICON_DIAGONAL_RATIO = 0.68;
const FRAME_TILE_RATIO = 0.70;
const FRAME_ICON_DIAGONAL_RATIO = 0.66;
/** Corner radius as fraction of tile (matches brand SVG rx=128/512). */
const TILE_RADIUS_RATIO = 0.25;

const APPS = [
    { id: 'simpleautos', accent: '#E84A1F' },
    { id: 'simplepropiedades', accent: '#4F46E5' },
    { id: 'simpleagenda', accent: '#0F766E' },
    { id: 'simpleserenatas', accent: '#E11D48' },
    { id: 'simpletickets', accent: '#0E7490' },
    { id: 'simpleresto', accent: '#F4B400' },
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

function colorDist(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function findContentBBox(data, width, height, channels, bg, threshold = 45) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * channels;
            const px = { r: data[i], g: data[i + 1], b: data[i + 2] };
            if (colorDist(px, bg) > threshold) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < 0) return { left: 0, top: 0, width, height };

    const pad = Math.round(Math.max(width, height) * 0.015);
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const right = Math.min(width - 1, maxX + pad);
    const bottom = Math.min(height - 1, maxY + pad);
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function extractIconPng(srcPath, accentHex) {
    const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const brandBg = hexToRgb(accentHex);
    const corner = { r: data[0], g: data[1], b: data[2] };
    const useBg = colorDist(corner, brandBg) < 90 ? corner : brandBg;

    const bbox = findContentBBox(data, info.width, info.height, info.channels, useBg, 45);
    const cropped = await sharp(srcPath).extract(bbox).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const out = Buffer.from(cropped.data);
    for (let i = 0; i < out.length; i += 4) {
        const px = { r: out[i], g: out[i + 1], b: out[i + 2] };
        if (colorDist(px, useBg) < 45) out[i + 3] = 0;
    }

    const withAlpha = await sharp(out, {
        raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
    })
        .png()
        .toBuffer();

    // Drop leftover transparent margins so sizing is exact.
    return sharp(withAlpha).trim({ threshold: 10 }).png().toBuffer();
}

async function resizeIconToDiagonal(iconPng, targetDiagonal) {
    const meta = await sharp(iconPng).metadata();
    const w0 = meta.width ?? 1;
    const h0 = meta.height ?? 1;
    const diag0 = Math.sqrt(w0 * w0 + h0 * h0);
    const scale = targetDiagonal / diag0;
    const tw = Math.max(1, Math.round(w0 * scale));
    const th = Math.max(1, Math.round(h0 * scale));
    const resized = await sharp(iconPng).resize(tw, th, { fit: 'fill' }).png().toBuffer();
    return { buf: resized, w: tw, h: th, diagonal: Math.round(Math.sqrt(tw * tw + th * th)) };
}

async function makeFullBleed(app, iconPng) {
    const accent = hexToRgb(app.accent);
    const targetDiag = Math.round(SIZE * FULL_ICON_DIAGONAL_RATIO);
    const { buf, w, h, diagonal } = await resizeIconToDiagonal(iconPng, targetDiag);
    const left = Math.round((SIZE - w) / 2);
    const top = Math.round((SIZE - h) / 2);

    await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: accent },
    })
        .composite([{ input: buf, left, top }])
        .png()
        .toFile(join(OUT, `ig-profile-${app.id}.png`));

    return { w, h, diagonal };
}

function roundedTilePng(tile, accentHex) {
    const rx = Math.round(tile * TILE_RADIUS_RATIO);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}">` +
        `<rect width="${tile}" height="${tile}" rx="${rx}" fill="${accentHex}"/>` +
        `</svg>`;
    return new Resvg(svg, { fitTo: { mode: 'width', value: tile } }).render().asPng();
}

async function makeFramed(app, iconPng) {
    const tile = Math.round(SIZE * FRAME_TILE_RATIO);
    const targetDiag = Math.round(tile * FRAME_ICON_DIAGONAL_RATIO);
    const tileBg = roundedTilePng(tile, app.accent);
    const { buf, w, h, diagonal } = await resizeIconToDiagonal(iconPng, targetDiag);
    const iconLeft = Math.round((tile - w) / 2);
    const iconTop = Math.round((tile - h) / 2);

    const tileWithIcon = await sharp(tileBg)
        .composite([{ input: buf, left: iconLeft, top: iconTop }])
        .png()
        .toBuffer();

    const left = Math.round((SIZE - tile) / 2);
    const top = Math.round((SIZE - tile) / 2);

    await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: hexToRgb(DARK) },
    })
        .composite([{ input: tileWithIcon, left, top }])
        .png()
        .toFile(join(OUT, `ig-profile-framed-${app.id}.png`));

    return { tile, icon: `${w}x${h}`, diagonal };
}

async function main() {
    await mkdir(OUT, { recursive: true });
    console.log(
        `SIZE=${SIZE} FULL_DIAG=${FULL_ICON_DIAGONAL_RATIO} FRAME_TILE=${FRAME_TILE_RATIO} FRAME_DIAG=${FRAME_ICON_DIAGONAL_RATIO}`
    );

    for (const app of APPS) {
        const src = join(AI_SRC, `ig-profile-${app.id}.png`);
        const icon = await extractIconPng(src, app.accent);
        const full = await makeFullBleed(app, icon);
        const framed = await makeFramed(app, icon);
        console.log(
            `${app.id}: full ${full.w}x${full.h} diag=${full.diagonal} | framed tile ${framed.tile} icon ${framed.icon} diag=${framed.diagonal} | ${app.accent}`
        );
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
