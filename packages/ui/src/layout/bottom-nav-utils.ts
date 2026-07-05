export type BottomNavHighlightable = {
    href: string;
    highlight?: boolean;
};

export function parseBottomNavHref(href: string): { pathname: string; search: string } {
    try {
        const url = new URL(href, 'http://localhost');
        return { pathname: url.pathname, search: url.search };
    } catch {
        const [pathname = href, search = ''] = href.split('?');
        return { pathname, search: search ? `?${search}` : '' };
    }
}

export function isSameBottomNavHref(a: string, b: string): boolean {
    const left = parseBottomNavHref(a);
    const right = parseBottomNavHref(b);
    if (left.pathname !== right.pathname) return false;
    if (left.search && right.search) return left.search === right.search;
    return true;
}

/** Coincidencia estricta de href (incluye query). Usar para resaltar un solo FAB. */
export function isExactBottomNavHref(a: string, b: string): boolean {
    const left = parseBottomNavHref(a);
    const right = parseBottomNavHref(b);
    return left.pathname === right.pathname && left.search === right.search;
}

/** Oculta el footer marketplace en rutas del panel (el panel usa su propio bottom nav). */
export function shouldHideMarketplaceMobileNav(pathname: string): boolean {
    return pathname.startsWith('/panel') && !pathname.startsWith('/panel/publicar');
}

export function applyBottomNavPrimaryHighlight<T extends BottomNavHighlightable>(
    items: T[],
    primaryHref?: string | null,
): T[] {
    if (!primaryHref) return items;
    return items.map((item) => ({
        ...item,
        highlight: isExactBottomNavHref(item.href, primaryHref),
    }));
}
