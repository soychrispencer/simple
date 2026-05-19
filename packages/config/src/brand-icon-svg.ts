type SimpleAppId =
    | 'simpleautos'
    | 'simplepropiedades'
    | 'simpleadmin'
    | 'simpleplataforma'
    | 'simpleagenda'
    | 'simpleserenatas';

type IconTokens = {
    accent: string;
    glyph: string;
};

/** Tabler IconConfetti (mismo glifo que BrandLogo en @simple/ui). */
function serenatasSvg(t: IconTokens): string {
    const scale = 14;
    const offset = (512 - 24 * scale) / 2;
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="128" fill="' + t.accent + '"/>'
        + '<g transform="translate(' + offset + ' ' + offset + ') scale(' + scale + ')"'
        + ' stroke="' + t.glyph + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">'
        + '<path d="M4 5h2"/>'
        + '<path d="M5 4v2"/>'
        + '<path d="M11.5 4l-.5 2"/>'
        + '<path d="M18 5h2"/>'
        + '<path d="M19 4v2"/>'
        + '<path d="M15 9l-1 1"/>'
        + '<path d="M18 13l2 -.5"/>'
        + '<path d="M18 19h2"/>'
        + '<path d="M19 18v2"/>'
        + '<path d="M14 16.518l-6.518 -6.518l-4.39 9.58a1 1 0 0 0 1.329 1.329l9.579 -4.39"/>'
        + '</g>'
        + '</svg>'
    );
}

function agendaSvg(t: IconTokens): string {
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="128" fill="' + t.accent + '"/>'
        + '<rect x="140" y="128" width="232" height="232" rx="24" stroke="' + t.glyph + '" stroke-width="24" fill="none"/>'
        + '<line x1="260" y1="80" x2="260" y2="128" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="200" y1="80" x2="200" y2="128" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="140" y1="200" x2="372" y2="200" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '</svg>'
    );
}

function autosSvg(t: IconTokens): string {
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="128" fill="' + t.accent + '"/>'
        + '<circle cx="256" cy="256" r="96" stroke="' + t.glyph + '" stroke-width="24" fill="none"/>'
        + '<circle cx="256" cy="256" r="21" fill="' + t.glyph + '"/>'
        + '<line x1="256" y1="128" x2="256" y2="160" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="256" y1="352" x2="256" y2="384" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="128" y1="256" x2="160" y2="256" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="352" y1="256" x2="384" y2="256" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="162" y1="162" x2="186" y2="186" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="326" y1="326" x2="350" y2="350" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="162" y1="350" x2="186" y2="326" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<line x1="326" y1="186" x2="350" y2="162" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '</svg>'
    );
}

function propiedadesSvg(t: IconTokens): string {
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="128" fill="' + t.accent + '"/>'
        + '<path d="M140 428 L372 428" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<path d="M172 428 L172 196 L256 128 L340 196 L340 428" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
        + '<path d="M244 428 L244 340 L292 340 L292 428" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<path d="M220 244 L268 244" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '<path d="M220 292 L268 292" stroke="' + t.glyph + '" stroke-width="24" stroke-linecap="round"/>'
        + '</svg>'
    );
}

const ADMIN_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
    + '<rect width="512" height="512" rx="128" fill="#4f46e5"/>'
    + '<path d="M256 140 C321 140 374 193 374 258 L374 316 C374 342 353 363 327 363 L185 363 C159 363 138 342 138 316 L138 258 C138 193 191 140 256 140 Z" stroke="white" stroke-width="16" fill="none"/>'
    + '<circle cx="256" cy="276" r="24" fill="white"/>'
    + '<line x1="256" y1="200" x2="256" y2="252" stroke="white" stroke-width="16" stroke-linecap="round"/>'
    + '</svg>';

const PLATAFORMA_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
    + '<rect width="512" height="512" rx="128" fill="#475569"/>'
    + '<path d="M140 428 L372 428" stroke="white" stroke-width="24" stroke-linecap="round"/>'
    + '<path d="M172 428 L172 196 L256 128 L340 196 L340 428" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    + '<path d="M244 428 L244 340 L292 340 L292 428" stroke="white" stroke-width="24" stroke-linecap="round"/>'
    + '<path d="M220 244 L268 244" stroke="white" stroke-width="24" stroke-linecap="round"/>'
    + '<path d="M220 292 L268 292" stroke="white" stroke-width="24" stroke-linecap="round"/>'
    + '</svg>';

export function buildSimpleBrandIconSvg(appId: SimpleAppId, tokens: IconTokens): string {
    switch (appId) {
        case 'simpleserenatas':
            return serenatasSvg(tokens);
        case 'simpleagenda':
            return agendaSvg(tokens);
        case 'simpleautos':
            return autosSvg(tokens);
        case 'simplepropiedades':
            return propiedadesSvg(tokens);
        case 'simpleadmin':
            return ADMIN_SVG;
        case 'simpleplataforma':
            return PLATAFORMA_SVG;
        default:
            return PLATAFORMA_SVG;
    }
}

export function buildSimpleBrandIconDataUri(appId: SimpleAppId, tokens: IconTokens): string {
    const svg = buildSimpleBrandIconSvg(appId, tokens).replace(/\s+/g, ' ').trim();
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
