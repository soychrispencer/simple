/**
 * Export profesional: HTML/CSS → Playwright screenshot a tamaño exacto.
 *
 * Uso: node export-html.mjs publica-gratis
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { getSimpleBrandIconSvg } = require('../../../../packages/config/dist/index.js');

const ASSETS = 'C:/Users/chris/.cursor/projects/c-Users-chris-Desktop-Simple/assets';

const SERVICES = {
    'publica-gratis': {
        id: 'publica-gratis',
        badge: 'PUBLICA GRATIS',
        titleHtml: 'Publica tu propiedad<span class="accent">en minutos</span>',
        subtitle: 'Crea tu publicación, recibe contactos y gestiona todo desde un solo lugar.',
        cards: [
            { icon: 'clock', label: 'Publicación\nen 3 minutos' },
            { icon: 'chat', label: 'Chat con\ninteresados' },
            { icon: 'rocket', label: 'Boost\nopcional' },
        ],
        cta: 'Publicar ahora',
        url: 'simplepropiedades.app',
        // Prefer local trimmed cluster (full objects, no edge crops)
        heroFile: 'hero-v2-trim-tight.png',
    },
};

function iconSvg(kind) {
    const paths = {
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
        chat: '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 4z"/>',
        rocket: '<path d="M4 13a8 8 0 0 1 7 7"/><path d="M4 19l4-1"/><path d="M14.5 4.5a6 6 0 0 1 5 5"/><path d="M9 15l6-6"/><path d="M12 9l3 3"/>',
    };
    return `<svg viewBox="0 0 24 24">${paths[kind] || paths.clock}</svg>`;
}

async function logoDataUri(size = 128) {
    const svg = getSimpleBrandIconSvg('simplepropiedades');
    const png = Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());
    return `data:image/png;base64,${png.toString('base64')}`;
}

async function prepareHero(srcPath, destPath) {
    // Soft trim: keep full phone + building + listing card, kill empty margins only
    await sharp(srcPath)
        .trim({ threshold: 8 })
        .png()
        .toFile(destPath);
}

function buildHtml(template, content, { format, logoSrc, heroSrc }) {
    const cards = content.cards
        .map(
            (c) => `<div class="card"><div class="icon-wrap">${iconSvg(c.icon)}</div><p>${c.label}</p></div>`,
        )
        .join('\n');

    return template
        .replaceAll('FORMAT', format)
        .replaceAll('LOGO_SRC', logoSrc)
        .replaceAll('HERO_SRC', heroSrc)
        .replaceAll('BADGE_TEXT', content.badge)
        .replaceAll('TITLE_HTML', content.titleHtml)
        .replaceAll('SUBTITLE_TEXT', content.subtitle)
        .replaceAll('CARD_HTML', cards)
        .replaceAll('CTA_TEXT', content.cta)
        .replaceAll('URL_TEXT', content.url);
}

async function exportFormat(browser, htmlPath, outPath, w, h) {
    const page = await browser.newPage({
        viewport: { width: w, height: h },
        deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
    await page.waitForSelector('.hero img');
    await page.evaluate(async () => {
        const imgs = [...document.images];
        await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }))));
        document.body.style.width = `${document.documentElement.style.getPropertyValue('--w') || ''}`;
    });
    // Force exact canvas size from CSS vars
    await page.addStyleTag({
        content: `html, body, .canvas { width: ${w}px !important; height: ${h}px !important; }`,
    });
    await page.locator('#ad').screenshot({ path: outPath, type: 'png' });
    await page.close();

    // Guarantee exact metadata size
    const buf = await sharp(outPath).resize(w, h, { fit: 'fill' }).png().toBuffer();
    await writeFile(outPath, buf);
    const meta = await sharp(outPath).metadata();
    console.log('✓', outPath.split(/[/\\]/).pop(), `${meta.width}x${meta.height}`);
}

async function main() {
    const serviceId = process.argv[2] || 'publica-gratis';
    const content = SERVICES[serviceId];
    if (!content) throw new Error(`Unknown service: ${serviceId}`);

    const outDir = join(__dirname, 'out');
    const heroesDir = join(__dirname, 'heroes');
    const tmpDir = join(__dirname, '.tmp-html');
    await mkdir(outDir, { recursive: true });
    await mkdir(heroesDir, { recursive: true });
    await mkdir(tmpDir, { recursive: true });

    const heroLocal = join(heroesDir, content.heroFile);
    const heroFallback = join(heroesDir, 'hero-publica-gratis-v2.png');
    const heroTrimmed = join(heroesDir, 'hero-export-trim.png');
    let heroSrcPath = heroLocal;
    try {
        await readFile(heroLocal);
    } catch {
        try {
            await copyFile(join(ASSETS, 'hero-publica-gratis-v2.png'), heroFallback);
        } catch {
            /* local v2 already present */
        }
        heroSrcPath = heroFallback;
    }
    await prepareHero(heroSrcPath, heroTrimmed);

    const logoSrc = await logoDataUri(128);
    const heroSrc = pathToFileURL(heroTrimmed).href;
    const template = await readFile(join(__dirname, 'template.html'), 'utf8');

    const browser = await chromium.launch({ headless: true });
    try {
        for (const format of /** @type {const} */ (['story', 'post'])) {
            const size = format === 'story' ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };
            const html = buildHtml(template, content, { format, logoSrc, heroSrc });
            const htmlPath = join(tmpDir, `${content.id}-${format}.html`);
            await writeFile(htmlPath, html, 'utf8');
            const outName = `simplepropiedades-${format}-${content.id}-01.png`;
            const outPath = join(outDir, outName);
            await exportFormat(browser, htmlPath, outPath, size.w, size.h);
            await copyFile(outPath, join(ASSETS, outName));
        }
    } finally {
        await browser.close();
    }

    console.log('done — HTML/Playwright export');
}

await main();
