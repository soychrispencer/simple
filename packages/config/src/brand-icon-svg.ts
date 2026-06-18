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

function tablerBrandSvg(t: IconTokens, paths: string[]): string {
    const scale = 14;
    const offset = (512 - 24 * scale) / 2;
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="128" fill="' + t.accent + '"/>'
        + '<g transform="translate(' + offset + ' ' + offset + ') scale(' + scale + ')"'
        + ' stroke="' + t.glyph + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">'
        + paths.map((path) => '<path d="' + path + '"/>').join('')
        + '</g>'
        + '</svg>'
    );
}

/** Tabler IconConfetti (mismo glifo que BrandLogo en @simple/ui). */
function serenatasSvg(t: IconTokens): string {
    return tablerBrandSvg(t, [
        'M4 5h2',
        'M5 4v2',
        'M11.5 4l-.5 2',
        'M18 5h2',
        'M19 4v2',
        'M15 9l-1 1',
        'M18 13l2 -.5',
        'M18 19h2',
        'M19 18v2',
        'M14 16.518l-6.518 -6.518l-4.39 9.58a1 1 0 0 0 1.329 1.329l9.579 -4.39',
    ]);
}

/** Tabler IconCalendar (mismo glifo que BrandLogo en @simple/ui). */
function agendaSvg(t: IconTokens): string {
    return tablerBrandSvg(t, [
        'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12',
        'M16 3v4',
        'M8 3v4',
        'M4 11h16',
        'M11 15h1',
        'M12 15v3',
    ]);
}

/** Tabler IconSteeringWheel (mismo glifo que BrandLogo en @simple/ui). */
function autosSvg(t: IconTokens): string {
    return tablerBrandSvg(t, [
        'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
        'M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
        'M12 14l0 7',
        'M10 12l-6.75 -2',
        'M14 12l6.75 -2',
    ]);
}

/** Tabler IconDoor (mismo glifo que BrandLogo en @simple/ui). */
function propiedadesSvg(t: IconTokens): string {
    return tablerBrandSvg(t, [
        'M14 12v.01',
        'M3 21h18',
        'M6 21v-16a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v16',
    ]);
}

/** Tabler IconLayoutDashboard (mismo glifo que BrandLogo en @simple/ui). */
function dashboardSvg(t: IconTokens): string {
    return tablerBrandSvg(t, [
        'M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1',
        'M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1',
        'M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1',
        'M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1',
    ]);
}

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
        case 'simpleplataforma':
            return dashboardSvg(tokens);
        default:
            return dashboardSvg(tokens);
    }
}

export function buildSimpleBrandIconDataUri(appId: SimpleAppId, tokens: IconTokens): string {
    const svg = buildSimpleBrandIconSvg(appId, tokens).replace(/\s+/g, ' ').trim();
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
