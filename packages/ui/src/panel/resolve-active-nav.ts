/** Path sin query ni hash (para comparar rutas de panel). */
export function cleanPanelPath(pathOrHref: string): string {
    return pathOrHref.split('?')[0]?.split('#')[0] ?? pathOrHref;
}

/**
 * Elige el ítem de nav cuya ruta coincide con `pathname` (exacta o prefijo anidado).
 * Prefiere el href más largo para que `/panel` no gane frente a `/panel/solicitudes`.
 */
export function resolveActiveNavHref(
    pathname: string,
    items: ReadonlyArray<{ href: string }>,
): string | null {
    const path = cleanPanelPath(pathname);
    let best: string | null = null;
    let bestLen = -1;

    for (const item of items) {
        const href = cleanPanelPath(item.href);
        const exact = path === href || path === `${href}/`;
        const isPanelRoot = href === '/panel';
        const nested = !isPanelRoot && path.startsWith(`${href}/`);
        if (!exact && !nested) continue;
        if (href.length > bestLen) {
            best = item.href;
            bestLen = href.length;
        }
    }

    return best;
}
