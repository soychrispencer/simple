import type { InstagramTemplateView as InstagramRenderTemplate } from './templates.js';

export type InstagramOverlayListing = { title: string; location?: string | null; price?: string | null };

function escapeSvgText(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function clampTemplateText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}â€¦`;
}

// SVG icon paths (24x24 viewBox) for highlights / badges / location / discount
const SVG_ICON_PATHS: Record<string, string> = {
    // Highlights: autos
    venta: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', // tag
    arriendo: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', // house
    subasta: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', // gavel
    proyecto: 'M2 20h20M5 20V10l7-6 7 6v10M9 20v-6h6v6', // building
    usado: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3', // check-circle
    nuevo: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z', // star
    bencina: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3', // fuel
    diesel: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3', // fuel (same)
    km: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4.5 2.5', // speedometer
    // Highlights: propiedades
    dorm: 'M3 7v11M21 7v11M3 13h18M7 13v5M17 13v5M7 8a2 2 0 012-2h2a2 2 0 012 2M13 8a2 2 0 012-2h2a2 2 0 012 2', // bed
    bano: 'M4 12h16a1 1 0 011 1v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 011-1zM6 12V5a2 2 0 012-2h3v2.25', // bath
    superficie: 'M21 3H3v18h18V3zM3 9h18M3 15h18M9 3v18M15 3v18', // grid/area
    casa: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', // house
    depto: 'M3 21h18V3H3v18zm3-12h3v3H6V9zm0 5h3v3H6v-3zm5-5h3v3h-3V9zm0 5h3v3h-3v-3zm5-5h3v3h-3V9zm0 5h3v3h-3v-3z', // building
    terreno: 'M2 22l5-10 5 6 4-8 6 12H2z', // mountain
    // Badges
    servicio: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.065.71.327 1.39.806 1.946a3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', // badge-check
    // Location
    ubicacion: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z', // map-pin
    // Discount
    descuento: 'M9 9h.01M15 15h.01M16 8l-8 8M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.065.71.327 1.39.806 1.946a3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', // percent-badge
};

function getHighlightIconKey(text: string): string {
    const t = text.toLowerCase().trim();
    if (t === 'venta') return 'venta';
    if (t === 'arriendo') return 'arriendo';
    if (t === 'subasta') return 'subasta';
    if (t.startsWith('proyecto')) return 'proyecto';
    if (t === 'usado' || t === 'semi-nuevo') return 'usado';
    if (t === 'nuevo') return 'nuevo';
    if (t.includes('km')) return 'km';
    if (t.includes('bencina') || t.includes('gasolina')) return 'bencina';
    if (t.includes('diesel') || t.includes('diÃ©sel') || t.includes('petrÃ³leo')) return 'diesel';
    if (t.includes('dorm')) return 'dorm';
    if (t.includes('bano')) return 'bano';
    if (t.includes('mÂ²') || t.includes('m2') || t.includes('mt')) return 'superficie';
    if (t.includes('casa')) return 'casa';
    if (t.includes('depto') || t.includes('departamento')) return 'depto';
    if (t.includes('terreno') || t.includes('sitio') || t.includes('parcela')) return 'terreno';
    return 'servicio'; // fallback
}

// FunciÃ³n simple para crear texto SVG usando <text> (evita fontconfig)
// Nota: text-to-svg fue removido porque requiere fuentes del sistema no disponibles en Docker
function svgTextElement(
    text: string,
    options: {
        x: number;
        y: number;
        fontSize: number;
        fontWeight?: number;
        fill?: string;
        anchor?: 'start' | 'middle' | 'end';
    }
): string {
    const anchor = options.anchor || 'start';
    const weight = options.fontWeight || 400;
    const escapedText = escapeSvgText(text);
    return `<text x="${options.x}" y="${options.y}" fill="${options.fill || '#000000'}" font-size="${options.fontSize}" font-weight="${weight}" text-anchor="${anchor}" font-family="Arial, sans-serif">${escapedText}</text>`;
}

function svgIcon(key: string, x: number, y: number, size: number, fill: string, strokeW = 1.5): string {
    const p = SVG_ICON_PATHS[key] || SVG_ICON_PATHS['servicio'];
    const scale = size / 24;
    return `<g transform="translate(${x},${y}) scale(${scale})"><path d="${p}" fill="none" stroke="${fill}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function splitTemplatePrice(value: string): { prefix: string; amount: string } {
    const normalized = value.replace(/\s+/g, ' ').trim();
    const ufMatch = normalized.match(/^(UF)\s*(.+)$/i);
    if (ufMatch) {
        return { prefix: ufMatch[1].toUpperCase(), amount: ufMatch[2].trim() };
    }
    const pesoMatch = normalized.match(/^(\$)\s*(.+)$/);
    if (pesoMatch) {
        return { prefix: pesoMatch[1], amount: pesoMatch[2].trim() };
    }
    const tokens = normalized.split(' ');
    if (tokens.length > 1) {
        return { prefix: tokens[0], amount: tokens.slice(1).join(' ') };
    }
    return { prefix: '', amount: normalized };
}

function wrapTemplateText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
    const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (words.length === 0) return [];

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (nextLine.length <= maxCharsPerLine) {
            currentLine = nextLine;
            continue;
        }

        if (currentLine) lines.push(currentLine);
        currentLine = word;

        if (lines.length === maxLines - 1) break;
    }

    if (lines.length < maxLines && currentLine) {
        lines.push(currentLine);
    }

    if (lines.length > maxLines) {
        return lines.slice(0, maxLines);
    }

    const consumed = lines.join(' ').length;
    if (consumed < value.trim().length && lines.length > 0) {
        lines[lines.length - 1] = clampTemplateText(lines[lines.length - 1], Math.max(3, maxCharsPerLine - 1));
    }

    return lines.slice(0, maxLines);
}

function renderSvgTextLines(
    lines: string[],
    options: {
        x: number;
        y: number;
        lineHeight: number;
        fontSize: number;
        fontWeight: number | string;
        fill: string;
        textAnchor?: 'start' | 'middle' | 'end';
    }
): string {
    return lines
        .map((line, index) => `
            <text
                x="${options.x}"
                y="${options.y + index * options.lineHeight}"
                fill="${options.fill}"
                font-size="${options.fontSize}"
                font-weight="${options.fontWeight}"
                ${options.textAnchor ? `text-anchor="${options.textAnchor}"` : ''}
            >${escapeSvgText(line)}</text>
        `)
        .join('');
}

export async function buildInstagramTemplateOverlaySvg(
    listing: InstagramOverlayListing,
    template: InstagramRenderTemplate,
    width: number,
    height: number
): Promise<Buffer> {
    const brandAccent = template.branding?.appId === 'simplepropiedades' ? '#4F46E5' : '#E84A1F';
    const titleLines = wrapTemplateText(template.headline || listing.title, template.overlayVariant.startsWith('property') ? 24 : 20, 2);
    const eyebrow = escapeSvgText(clampTemplateText(template.eyebrow, 24));
    const location = escapeSvgText(clampTemplateText(template.locationLabel || listing.location || 'Chile', 28));
    const priceLockup = splitTemplatePrice(clampTemplateText(template.priceLabel || listing.price || 'Consultar precio', 18));
    const pricePrefix = escapeSvgText(priceLockup.prefix);
    const priceAmount = escapeSvgText(priceLockup.amount);
    const highlights = (template.highlights ?? []).slice(0, 4).map((item: string) => clampTemplateText(item, 18));
    const summaryLine = clampTemplateText(highlights.join('   Â·   '), 64);
    const badgeText = escapeSvgText(clampTemplateText(template.branding.badgeText, 18));
    const ctaLabel = escapeSvgText(clampTemplateText(template.ctaLabel, 26));
    const topBandHeight = template.layoutVariant === 'portrait' ? 128 : 104;
    const bottomBandHeight = template.layoutVariant === 'portrait' ? 230 : 216;
    // Property template layout vars
    const pillY = template.overlayVariant.startsWith('property')
        ? (template.layoutVariant === 'portrait' ? height - bottomBandHeight - 116 : height - bottomBandHeight - 92)
        : 0;
    const priceY = height - 74;
    const detailsY = height - 136;

    const topBand = template.overlayVariant.startsWith('property')
        ? `
            <rect x="0" y="0" width="${width}" height="${topBandHeight}" fill="${template.colors.secondary}" opacity="0.96" />
            <text x="${width - 34}" y="64" fill="${template.colors.textInverse}" font-size="30" font-weight="800" text-anchor="end">${eyebrow}</text>
        `
        : '';

    const locationPill = template.overlayVariant.startsWith('property')
        ? `
            <rect x="32" y="${pillY}" rx="28" ry="28" width="350" height="64" fill="${template.colors.accent}" />
            <rect x="36" y="${pillY + 4}" rx="24" ry="24" width="342" height="56" fill="#FFFFFF" opacity="0.98" />
            <text x="66" y="${pillY + 42}" fill="${template.colors.secondary}" font-size="30" font-weight="700">${location}</text>
        `
        : '';

    let detailsBand: string;
    if (template.overlayVariant === 'property-conversion') {
        detailsBand = `
            <rect x="24" y="${height - bottomBandHeight - 18}" rx="28" ry="28" width="${width - 48}" height="${bottomBandHeight}" fill="#FFFFFF" opacity="0.88" />
            ${renderSvgTextLines(titleLines, {
                x: 56,
                y: detailsY - 54,
                lineHeight: 42,
                fontSize: 34,
                fontWeight: 800,
                fill: template.colors.textPrimary,
            })}
            <text x="56" y="${detailsY + 18}" fill="${template.colors.textPrimary}" font-size="25" font-weight="700">${escapeSvgText(summaryLine)}</text>
            <text x="56" y="${priceY}" fill="${template.colors.accent}" font-size="36" font-weight="700">${eyebrow}</text>
            ${pricePrefix ? `<text x="${width - 286}" y="${priceY}" fill="${template.colors.secondary}" font-size="26" font-weight="700">${pricePrefix}</text>` : ''}
            <text x="${width - 56}" y="${priceY}" fill="${template.colors.secondary}" font-size="56" font-weight="800" text-anchor="end">${priceAmount}</text>
            <text x="${width - 56}" y="${priceY - 62}" fill="${template.colors.textPrimary}" font-size="24" font-weight="700" text-anchor="end">${ctaLabel}</text>
        `;
    } else if (template.overlayVariant.startsWith('property')) {
        detailsBand = `
            <rect x="0" y="${height - bottomBandHeight}" width="${width}" height="${bottomBandHeight}" fill="${template.colors.secondary}" opacity="0.72" />
            ${renderSvgTextLines(titleLines, {
                x: 56,
                y: detailsY - 54,
                lineHeight: 42,
                fontSize: 34,
                fontWeight: 800,
                fill: template.colors.textInverse,
            })}
            <text x="56" y="${detailsY + 18}" fill="${template.colors.textInverse}" font-size="25" font-weight="700">${escapeSvgText(summaryLine)}</text>
            <rect x="${width - 318}" y="${height - bottomBandHeight + 34}" rx="26" ry="26" width="262" height="132" fill="${template.colors.accent}" />
            <text x="${width - 286}" y="${height - bottomBandHeight + 72}" fill="${template.colors.textInverse}" font-size="20" font-weight="700">${template.overlayVariant === 'property-project' ? 'Desde' : badgeText}</text>
            ${pricePrefix ? `<text x="${width - 286}" y="${height - bottomBandHeight + 118}" fill="${template.colors.textInverse}" font-size="24" font-weight="700">${pricePrefix}</text>` : ''}
            <text x="${width - 76}" y="${height - bottomBandHeight + 124}" fill="${template.colors.textInverse}" font-size="50" font-weight="800" text-anchor="end">${priceAmount}</text>
            <text x="${width - 76}" y="${height - bottomBandHeight + 152}" fill="${template.colors.textInverse}" font-size="18" font-weight="700" text-anchor="end">${ctaLabel}</text>
        `;
    } else if (template.overlayVariant === 'essential-watermark') {
        // BÃSICO: Sin overlay SVG â€” solo logo (agregado por sharp composite)
        detailsBand = '';
    } else if (template.overlayVariant === 'professional-centered') {
        // PROFESIONAL: Card brandAccent en la parte inferior con precio, tÃ­tulo (1 lÃ­nea), highlights con iconos, ubicaciÃ³n, badges
        const cx = Math.round(width / 2);
        const margin = 40;
        const cardW = width - margin * 2;
        const cardR = 48;
        const fullPriceText = clampTemplateText(template.offerPriceLabel || template.priceLabel || 'Consultar', 20);
        const origPriceText = template.offerPriceLabel ? clampTemplateText(template.priceLabel || '', 20) : '';
        const proTitleText = template.title ? clampTemplateText(template.title.toUpperCase(), 48) : '';
        const locTextRaw = template.locationLabel ? clampTemplateText(template.locationLabel, 24) : '';

        // Dynamic card height
        let ch = 72; // top padding (logo overlap space)
        ch += 80; // price
        if (origPriceText) ch += 28;
        if (proTitleText) ch += 46;
        if (highlights.length > 0) ch += 46;
        if (locTextRaw) ch += 56;
        ch += 28; // bottom padding
        const cardH = Math.max(ch, 260);
        const cardY = height - margin - cardH;

        // Content positions
        let y = cardY + 72;
        const priceBaseline = y + 62;
        y += 78;
        let strikeSvg = '';
        if (origPriceText) {
            const origPricePath = svgTextElement(origPriceText, { x: cx, y: y + 14, fontSize: 22, fill: 'rgba(255,255,255,0.5)', anchor: 'middle' });
            strikeSvg = origPricePath.replace('/>', ' text-decoration="line-through"/>');
            y += 28;
        }
        let titleSvg = '';
        if (proTitleText) {
            y += 6;
            titleSvg = svgTextElement(proTitleText, { x: cx, y: y + 30, fontSize: 38, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' });
            y += 40;
        }
        // Highlights with icons â€” horizontal row, font 30 semibold
        let hlSvg = '';
        if (highlights.length > 0) {
            y += 8;
            const hlItems = highlights.slice(0, 4);
            const hlTotalW = hlItems.reduce((acc, h) => acc + h.length * 16 + 38, 0) + (hlItems.length - 1) * 16;
            let hx = cx - hlTotalW / 2;
            const hlY = y + 6;
            for (const h of hlItems) {
                const iconKey = getHighlightIconKey(h);
                hlSvg += svgIcon(iconKey, hx, hlY, 24, 'rgba(255,255,255,0.8)');
                hx += 28;
                const hlPath = svgTextElement(h.toUpperCase(), { x: hx, y: hlY + 20, fontSize: 24, fontWeight: 600, fill: 'rgba(255,255,255,0.8)', anchor: 'start' });
                hlSvg += hlPath;
                hx += h.length * 16 + 10 + 16;
            }
            y += 36;
        }
        // Location pill with icon â€” bigger
        let locSvg = '';
        if (locTextRaw) {
            y += 14;
            const pillW = Math.min(locTextRaw.length * 16 + 80, cardW - 60);
            const pillX = cx - pillW / 2;
            const locPath = svgTextElement(locTextRaw, { x: cx + 12, y: y + 33, fontSize: 24, fontWeight: 700, fill: brandAccent, anchor: 'middle' });
            locSvg = `
                <rect x="${pillX}" y="${y}" rx="24" ry="24" width="${pillW}" height="48" fill="#FFFFFF" />
                ${svgIcon('ubicacion', pillX + 14, y + 12, 24, brandAccent, 2)}
                ${locPath}
            `;
        }

        // Badges top-right â€” auto-width based on text length
        let badgesSvg = '';
        let bY = 28;
        if (template.discountLabel) {
            const dt = escapeSvgText(template.discountLabel);
            const dtw = Math.min(dt.length * 18 + 72, 240);
            const dtx = width - dtw - 30;
            badgesSvg += `
                <rect x="${dtx}" y="${bY}" rx="22" ry="22" width="${dtw}" height="58" fill="${brandAccent}" />
                ${svgIcon('descuento', dtx + 16, bY + 15, 28, '#FFFFFF', 2)}
                <text x="${dtx + dtw/2 + 14}" y="${bY + 40}" fill="#FFFFFF" font-size="28" font-weight="700" text-anchor="middle">${dt}</text>
            `;
            bY += 68;
        }
        for (const badge of (template.badges ?? []).slice(0, 3)) {
            const bt = escapeSvgText(badge);
            const btw = Math.min(bt.length * 16 + 64, 260);
            const btx = width - btw - 30;
            badgesSvg += `
                <rect x="${btx}" y="${bY}" rx="18" ry="18" width="${btw}" height="48" fill="#FFFFFF" />
                ${svgIcon('servicio', btx + 14, bY + 10, 24, '#111111')}
                <text x="${btx + btw/2 + 12}" y="${bY + 33}" fill="#111111" font-size="22" font-weight="600" text-anchor="middle">${bt}</text>
            `;
            bY += 56;
        }

        detailsBand = `
            ${badgesSvg}
            <rect x="${margin}" y="${cardY}" rx="${cardR}" ry="${cardR}" width="${cardW}" height="${cardH}" fill="${brandAccent}" />
            ${svgTextElement(fullPriceText, { x: cx, y: priceBaseline, fontSize: 80, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' })}
            ${strikeSvg}
            ${titleSvg}
            ${hlSvg}
            ${locSvg}
        `;
    } else if (template.overlayVariant === 'signature-complete') {
        // PREMIUM: Gradiente oscuro elegante, tÃ­tulo 1 lÃ­nea, highlights con iconos, badges/loc mÃ¡s grandes
        const cx = Math.round(width / 2);
        const fullPrice = escapeSvgText(clampTemplateText(template.offerPriceLabel || template.priceLabel || 'Consultar', 20));
        const origPrice = template.offerPriceLabel ? escapeSvgText(clampTemplateText(template.priceLabel || '', 20)) : '';
        const sigTitle = template.title ? escapeSvgText(clampTemplateText(template.title.toUpperCase(), 48)) : '';
        const locText = template.locationLabel ? clampTemplateText(template.locationLabel, 24) : '';

        // Gradient rect covers bottom 55%
        const gradH = Math.round(height * 0.55);
        const gradY = height - gradH;

        // Content positions from bottom
        let y = height - 36; // start from bottom padding
        // Location pill with icon
        let locSvg = '';
        if (locText) {
            y -= 52;
            const pillW = Math.min(locText.length * 16 + 80, width - 100);
            const pillX = cx - pillW / 2;
            locSvg = `
                <rect x="${pillX}" y="${y}" rx="24" ry="24" width="${pillW}" height="48" fill="#FFFFFF" />
                ${svgIcon('ubicacion', pillX + 14, y + 12, 24, brandAccent, 2)}
                <text x="${cx + 12}" y="${y + 33}" fill="${brandAccent}" font-size="24" font-weight="700" text-anchor="middle">${locText}</text>
            `;
            y -= 10;
        }
        // Highlights with icons â€” horizontal row
        let hlSvg = '';
        if (highlights.length > 0) {
            y -= 36;
            const hlItems = highlights.slice(0, 4);
            const hlTotalW = hlItems.reduce((acc, h) => acc + h.length * 16 + 38, 0) + (hlItems.length - 1) * 16;
            let hx = cx - hlTotalW / 2;
            const hlY = y;
            for (const h of hlItems) {
                const iconKey = getHighlightIconKey(h);
                hlSvg += svgIcon(iconKey, hx, hlY, 24, 'rgba(255,255,255,0.65)');
                hx += 28;
                hlSvg += `<text x="${hx}" y="${hlY + 20}" fill="rgba(255,255,255,0.65)" font-size="24" font-weight="600">${escapeSvgText(h.toUpperCase())}</text>`;
                hx += h.length * 16 + 10 + 16;
            }
            y -= 14;
        }
        // Title â€” single line, font 38
        let titleSvg = '';
        if (sigTitle) {
            y -= 44;
            titleSvg = `<text x="${cx}" y="${y + 32}" fill="#FFFFFF" font-size="38" font-weight="900" text-anchor="middle">${sigTitle}</text>`;
            y -= 10;
        }
        let strikeSvg = '';
        if (origPrice) {
            y -= 28;
            strikeSvg = `<text x="${cx}" y="${y + 18}" fill="rgba(255,255,255,0.4)" font-size="22" font-weight="500" text-anchor="middle" text-decoration="line-through">${origPrice}</text>`;
            y -= 6;
        }
        const priceBaseline = y;

        // Badges top-right â€” auto-width based on text length
        let badgesSvg = '';
        let bY = 28;
        if (template.discountLabel) {
            const dtText = clampTemplateText(template.discountLabel, 18);
            const dtw = Math.min(dtText.length * 18 + 72, 240);
            const dtx = width - dtw - 30;
            const dtPath = svgTextElement(dtText, { x: dtx + dtw/2 + 14, y: bY + 40, fontSize: 28, fontWeight: 700, fill: '#FFFFFF', anchor: 'middle' });
            badgesSvg += `
                <rect x="${dtx}" y="${bY}" rx="22" ry="22" width="${dtw}" height="58" fill="${brandAccent}" />
                ${svgIcon('descuento', dtx + 16, bY + 15, 28, '#FFFFFF', 2)}
                ${dtPath}
            `;
            bY += 68;
        }
        for (const badge of (template.badges ?? []).slice(0, 3)) {
            const btText = clampTemplateText(badge, 16);
            const btw = Math.min(btText.length * 16 + 64, 260);
            const btx = width - btw - 30;
            const btPath = svgTextElement(btText, { x: btx + btw/2 + 12, y: bY + 33, fontSize: 22, fontWeight: 600, fill: '#111111', anchor: 'middle' });
            badgesSvg += `
                <rect x="${btx}" y="${bY}" rx="18" ry="18" width="${btw}" height="48" fill="#FFFFFF" />
                ${svgIcon('servicio', btx + 14, bY + 10, 24, '#111111')}
                ${btPath}
            `;
            bY += 56;
        }

        detailsBand = `
            <rect x="0" y="${gradY}" width="${width}" height="${gradH}" fill="url(#premiumGrad)" />
            ${badgesSvg}
            ${svgTextElement(fullPrice, { x: cx, y: priceBaseline, fontSize: 80, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' })}
            ${strikeSvg}
            ${titleSvg}
            ${hlSvg}
            ${locSvg}
        `;
    } else {
        detailsBand = '';
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif">
            <defs>
                <linearGradient id="titleFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.7" />
                </linearGradient>
                <linearGradient id="essentialGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
                </linearGradient>
                <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="30%" stop-color="#000000" stop-opacity="0.3" />
                    <stop offset="60%" stop-color="#000000" stop-opacity="0.75" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.95" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
            ${topBand}
            ${locationPill}
            ${detailsBand}
        </svg>
    `;

    return Buffer.from(svg, 'utf-8');
}
