/**
 * Sistema visual SimplePropiedades — compose story + post
 * Tokens fijos; solo cambia el contenido del servicio.
 *
 * Uso: node compose.mjs publica-gratis
 */
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { getSimpleBrandIconSvg } = require('../../../../packages/config/dist/index.js');

const ASSETS = 'C:/Users/chris/.cursor/projects/c-Users-chris-Desktop-Simple/assets';
const FONT_REG = 'C:/Windows/Fonts/segoeui.ttf';
const FONT_BOLD = 'C:/Windows/Fonts/segoeuib.ttf';

/** @typedef {{
 *  id: string,
 *  badge: string,
 *  badgeIcon: 'star' | 'tag' | 'calc' | 'rocket',
 *  titleLines: Array<{ text: string, accent?: boolean }>,
 *  subtitle: string,
 *  cards: Array<{ icon: 'clock' | 'chat' | 'rocket' | 'doc' | 'chart' | 'shield', label: string }>,
 *  cta: string,
 *  url: string,
 *  heroFile: string,
 * }} ServiceContent */

const TOKENS = {
    primary: '#4F46E5',
    deep: '#312E81',
    text: '#0C0C0E',
    gray: '#6B7280',
    grayMuted: '#9CA3AF',
    bg: '#F7F7F5',
    surface: '#FFFFFF',
    border: '#E8E8E6',
    radiusButton: 12,
    radiusCard: 16,
    radiusLogo: 14,
};

/** @type {Record<string, ServiceContent>} */
const SERVICES = {
    'publica-gratis': {
        id: 'publica-gratis',
        badge: 'PUBLICA GRATIS',
        badgeIcon: 'star',
        titleLines: [
            { text: 'Publica tu propiedad' },
            { text: 'en minutos', accent: true },
        ],
        subtitle: 'Crea tu publicación, recibe contactos y gestiona todo desde un solo lugar.',
        cards: [
            { icon: 'clock', label: 'Publicación\nen 3 minutos' },
            { icon: 'chat', label: 'Chat con\ninteresados' },
            { icon: 'rocket', label: 'Boost\nopcional' },
        ],
        cta: 'Publicar ahora',
        url: 'simplepropiedades.app',
        heroFile: 'hero-publica-gratis-v2.png',
    },
};

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function iconPath(kind) {
    // Tabler-style 24 viewBox paths (stroke icons)
    switch (kind) {
        case 'clock':
            return '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>';
        case 'chat':
            return '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 4z"/>';
        case 'rocket':
            return '<path d="M4 13a8 8 0 0 1 7 7"/><path d="M4 19l4-1"/><path d="M14.5 4.5a6 6 0 0 1 5 5"/><path d="M9 15l6-6"/><path d="M12 9l3 3"/>';
        case 'star':
            return '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8z"/>';
        case 'tag':
            return '<path d="M6 6h7l5 5-7 7-5-5V6"/><circle cx="9" cy="9" r="1"/>';
        case 'calc':
            return '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h2"/><path d="M12 11h2"/><path d="M16 11h1"/><path d="M8 15h2"/><path d="M12 15h2"/>';
        case 'doc':
            return '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6"/><path d="M9 17h4"/>';
        case 'chart':
            return '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/>';
        case 'shield':
            return '<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4"/><path d="M9 12l2 2 4-4"/>';
        default:
            return '<circle cx="12" cy="12" r="8"/>';
    }
}

function strokeIcon(kind, size, color) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath(kind)}</svg>`;
}

function paperPlaneIcon(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14l11-11"/><path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1L21 3"/></svg>`;
}

function globeIcon(size, color) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/></svg>`;
}

function wrapLabel(label, maxChars) {
    if (label.includes('\n')) {
        return label.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);
    }
    const words = label.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (next.length > maxChars && cur) {
            lines.push(cur);
            cur = w;
        } else {
            cur = next;
        }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
}

/**
 * Dense rhythm — less empty air, larger hero.
 * NOTE: SVG text `y` is baseline → titleTop must clear badge bottom + ascent.
 * Story critical content inside Meta safe band (269 → 1536).
 */
function layoutFor(format) {
    if (format === 'story') {
        return {
            W: 1080,
            H: 1920,
            side: 64,
            logoTop: 292,
            logoSize: 58,
            wordmarkSize: 36,
            badgeTop: 370,
            titleTop: 486, // baseline after badge
            titleSize: 56,
            titleLineGap: 62,
            subtitleTop: 580,
            subtitleSize: 25,
            cardsTop: 640,
            cardH: 168,
            cardGap: 16,
            heroTop: 828,
            heroH: 540,
            ctaTop: 1390,
            ctaH: 70,
            ctaW: 440,
            urlTop: 1484,
            urlSize: 24,
            fontFiles: [FONT_REG, FONT_BOLD],
        };
    }
    return {
        W: 1080,
        H: 1350,
        side: 56,
        logoTop: 48,
        logoSize: 50,
        wordmarkSize: 32,
        badgeTop: 114,
        titleTop: 214, // baseline after badge — avoids overlap
        titleSize: 46,
        titleLineGap: 52,
        subtitleTop: 290,
        subtitleSize: 22,
        cardsTop: 348,
        cardH: 148,
        cardGap: 14,
        heroTop: 516,
        heroH: 430,
        ctaTop: 968,
        ctaH: 64,
        ctaW: 400,
        urlTop: 1054,
        urlSize: 22,
        fontFiles: [FONT_REG, FONT_BOLD],
    };
}

async function logoPng(size) {
    const svg = getSimpleBrandIconSvg('simplepropiedades');
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: size },
    });
    return Buffer.from(resvg.render().asPng());
}

function defsBlock(W, H) {
    const T = TOKENS;
    return `
      <defs>
        <radialGradient id="blobL" cx="18%" cy="72%" r="48%">
          <stop offset="0%" stop-color="${T.primary}" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="${T.primary}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="blobR" cx="88%" cy="28%" r="42%">
          <stop offset="0%" stop-color="${T.primary}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="${T.primary}" stop-opacity="0"/>
        </radialGradient>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.10"/>
        </filter>
      </defs>`;
}

function topChromeInner(L, content, logoHref) {
    const { W, H } = L;
    const T = TOKENS;
    const contentW = W - L.side * 2;
    const cardW = Math.floor((contentW - L.cardGap * 2) / 3);
    const cardsX = L.side;

    const titleSvg = content.titleLines
        .map((line, i) => {
            const y = L.titleTop + i * L.titleLineGap;
            const fill = line.accent ? T.primary : T.text;
            return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Segoe UI" font-weight="700" font-size="${L.titleSize}" fill="${fill}">${esc(line.text)}</text>`;
        })
        .join('\n');

    const subMax = Math.floor(contentW / (L.subtitleSize * 0.52));
    const subLines = wrapLabel(content.subtitle, subMax);
    const subtitleSvg = subLines
        .map((line, i) => `<text x="${W / 2}" y="${L.subtitleTop + i * Math.round(L.subtitleSize * 1.35)}" text-anchor="middle" font-family="Segoe UI" font-weight="400" font-size="${L.subtitleSize}" fill="${T.gray}">${esc(line)}</text>`)
        .join('\n');

    const cardsSvg = content.cards
        .map((card, i) => {
            const x = cardsX + i * (cardW + L.cardGap);
            const y = L.cardsTop;
            const iconSize = Math.round(L.cardH * 0.26);
            const circleR = Math.round(iconSize * 0.9);
            const lines = wrapLabel(card.label, Math.floor(cardW / 10));
            const textSize = Math.max(18, Math.round(L.cardH * 0.145));
            const lineH = Math.round(textSize * 1.2);
            const textStart = y + circleR * 2 + 28;
            const labels = lines
                .map((ln, li) => `<text x="${x + cardW / 2}" y="${textStart + li * lineH}" text-anchor="middle" font-family="Segoe UI" font-weight="700" font-size="${textSize}" fill="${T.primary}">${esc(ln)}</text>`)
                .join('\n');
            const cx = x + cardW / 2;
            const cy = y + 18 + circleR;
            return `
            <g filter="url(#cardShadow)">
              <rect x="${x}" y="${y}" width="${cardW}" height="${L.cardH}" rx="${T.radiusCard}" fill="${T.surface}" stroke="${T.border}" stroke-width="1"/>
            </g>
            <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${T.primary}" fill-opacity="0.10"/>
            <g transform="translate(${cx - iconSize / 2}, ${cy - iconSize / 2})">
              ${strokeIcon(card.icon, iconSize, T.primary)}
            </g>
            ${labels}`;
        })
        .join('\n');

    const badgeH = 40;
    const badgeTextApprox = content.badge.length * 11 + 36;
    const badgeW = badgeTextApprox + 44;
    const badgeX = (W - badgeW) / 2;
    const badgeY = L.badgeTop;
    const wordmarkY = L.logoTop + L.logoSize * 0.68;
    const logoX = W / 2 - (L.logoSize + 14 + estimateWordmarkWidth(L.wordmarkSize)) / 2;

    return `
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#blobL)"/>
  <rect width="${W}" height="${H}" fill="url(#blobR)"/>
  ${dotGrid(48, H * 0.55, 5, 8, 14, T.grayMuted)}
  ${dotGrid(W - 120, H * 0.42, 4, 6, 14, T.grayMuted)}

  <image href="${logoHref}" x="${logoX}" y="${L.logoTop}" width="${L.logoSize}" height="${L.logoSize}"/>
  <text x="${logoX + L.logoSize + 14}" y="${wordmarkY}" font-family="Segoe UI" font-weight="700" font-size="${L.wordmarkSize}">
    <tspan fill="${T.text}">Simple</tspan><tspan fill="${T.primary}">Propiedades</tspan>
  </text>

  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${T.radiusButton}" fill="${T.deep}"/>
  <g transform="translate(${badgeX + 16}, ${badgeY + 8})">${strokeIcon(content.badgeIcon, 24, '#FFFFFF')}</g>
  <text x="${badgeX + 48}" y="${badgeY + 27}" font-family="Segoe UI" font-weight="700" font-size="15" fill="#FFFFFF" letter-spacing="0.6">${esc(content.badge)}</text>

  ${titleSvg}
  ${subtitleSvg}
  ${cardsSvg}`;
}

function footerChromeInner(L, content) {
    const { W } = L;
    const T = TOKENS;
    const ctaX = (W - L.ctaW) / 2;
    const iconCta = 22;
    // Gradient veil only under CTA — keeps hero visible without hard cut
    return `
  <defs>
    <linearGradient id="ctaVeil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${T.bg}" stop-opacity="0"/>
      <stop offset="55%" stop-color="${T.bg}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${T.bg}" stop-opacity="1"/>
    </linearGradient>
    <filter id="ctaShadow" x="-10%" y="-30%" width="120%" height="180%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="${T.primary}" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect x="0" y="${L.ctaTop - 56}" width="${W}" height="${L.H - (L.ctaTop - 56)}" fill="url(#ctaVeil)"/>
  <g filter="url(#ctaShadow)">
    <rect x="${ctaX}" y="${L.ctaTop}" width="${L.ctaW}" height="${L.ctaH}" rx="${T.radiusButton}" fill="${T.primary}"/>
  </g>
  <g transform="translate(${ctaX + 40}, ${L.ctaTop + (L.ctaH - iconCta) / 2})">${paperPlaneIcon(iconCta)}</g>
  <text x="${ctaX + L.ctaW / 2 + 12}" y="${L.ctaTop + L.ctaH / 2 + 7}" text-anchor="middle" font-family="Segoe UI" font-weight="700" font-size="${Math.round(L.ctaH * 0.36)}" fill="#FFFFFF">${esc(content.cta)}</text>
  <g transform="translate(${W / 2 - estimateUrlWidth(content.url, L.urlSize) / 2}, ${L.urlTop})">
    <g transform="translate(0, -2)">${globeIcon(L.urlSize, T.primary)}</g>
    <text x="${L.urlSize + 10}" y="${L.urlSize - 4}" font-family="Segoe UI" font-weight="600" font-size="${L.urlSize}" fill="${T.primary}">${esc(content.url)}</text>
  </g>`;
}

function topChromeSvg(L, content, logoHref) {
    const { W, H } = L;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defsBlock(W, H)}
  ${topChromeInner(L, content, logoHref)}
</svg>`;
}

function footerChromeSvg(L, content) {
    const { W, H } = L;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${footerChromeInner(L, content)}
</svg>`;
}

function estimateWordmarkWidth(fontSize) {
    // "SimplePropiedades" ~ 17 chars
    return Math.round(17 * fontSize * 0.58);
}

function estimateUrlWidth(url, fontSize) {
    return Math.round(url.length * fontSize * 0.55) + fontSize + 10;
}

function dotGrid(ox, oy, cols, rows, gap, color) {
    let s = '';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            s += `<circle cx="${ox + c * gap}" cy="${oy + r * gap}" r="2" fill="${color}" opacity="0.45"/>`;
        }
    }
    return s;
}

function svgToPng(svg, width, fontFiles) {
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: width },
        font: {
            fontFiles,
            loadSystemFonts: false,
            defaultFontFamily: 'Segoe UI',
        },
    });
    return Buffer.from(resvg.render().asPng());
}

async function renderLayers(format, content, logoBuf) {
    const L = layoutFor(format);
    const logoHref = `data:image/png;base64,${logoBuf.toString('base64')}`;
    const top = svgToPng(topChromeSvg(L, content, logoHref), L.W, L.fontFiles);
    const footer = svgToPng(footerChromeSvg(L, content), L.W, L.fontFiles);
    return { top, footer, L };
}

async function placeHero(topPng, footerPng, L, heroPath) {
    const maxHeroBottom = L.ctaTop - 12;
    const bandH = Math.min(L.heroH, maxHeroBottom - L.heroTop);
    const bandW = L.W;
    const padX = 24;
    const padY = 8;

    // Trim empty margins so we place the FULL cluster (phone+building+card)
    const trimmed = await sharp(heroPath)
        .trim({ threshold: 18 })
        .png()
        .toBuffer();
    const tm = await sharp(trimmed).metadata();
    const tw = tm.width ?? 1;
    const th = tm.height ?? 1;

    const maxW = bandW - padX * 2;
    const maxH = bandH - padY * 2;
    const scale = Math.min(maxW / tw, maxH / th);
    const nw = Math.max(1, Math.round(tw * scale));
    const nh = Math.max(1, Math.round(th * scale));
    const resized = await sharp(trimmed).resize(nw, nh, { fit: 'fill' }).png().toBuffer();

    const left = Math.round((bandW - nw) / 2);
    const topInBand = Math.round((bandH - nh) / 2);

    const band = await sharp({
        create: {
            width: bandW,
            height: bandH,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: resized, left, top: topInBand }])
        .png()
        .toBuffer();

    // Soft top blend into cards only
    const fadeH = 20;
    const fadeSvg = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bandW}" height="${bandH}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0"/>
      <stop offset="${(fadeH / bandH) * 100}%" stop-color="white" stop-opacity="1"/>
      <stop offset="100%" stop-color="white" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <mask id="m"><rect width="100%" height="100%" fill="url(#f)"/></mask>
  <rect width="100%" height="100%" fill="white" mask="url(#m)"/>
</svg>`);

    const heroMasked = await sharp(band)
        .composite([{ input: fadeSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

    return sharp(topPng)
        .composite([
            { input: heroMasked, left: 0, top: L.heroTop },
            { input: footerPng, left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
}

async function composeService(serviceId) {
    const content = SERVICES[serviceId];
    if (!content) throw new Error(`Unknown service: ${serviceId}`);

    const outDir = join(__dirname, 'out');
    const heroesDir = join(__dirname, 'heroes');
    await mkdir(outDir, { recursive: true });
    await mkdir(heroesDir, { recursive: true });

    const heroAsset = join(ASSETS, content.heroFile);
    const heroLocal = join(heroesDir, content.heroFile);
    await copyFile(heroAsset, heroLocal);

    for (const format of /** @type {const} */ (['story', 'post'])) {
        const L0 = layoutFor(format);
        const logoBuf = await logoPng(L0.logoSize * 2);
        const logoSized = await sharp(logoBuf).resize(L0.logoSize, L0.logoSize).png().toBuffer();
        const { top, footer, L } = await renderLayers(format, content, logoSized);
        const finalBuf = await placeHero(top, footer, L, heroLocal);
        const exact = await sharp(finalBuf)
            .resize(L.W, L.H, { fit: 'fill' })
            .png()
            .toBuffer();

        const name = `simplepropiedades-${format}-${content.id}-01.png`;
        const dest = join(outDir, name);
        await sharp(exact).png().toFile(dest);
        const meta = await sharp(dest).metadata();
        console.log('✓', name, `${meta.width}x${meta.height}`);

        // Copy to Cursor assets for preview
        await copyFile(dest, join(ASSETS, name));
    }
}

const serviceId = process.argv[2] || 'publica-gratis';
await composeService(serviceId);
console.log('done');
