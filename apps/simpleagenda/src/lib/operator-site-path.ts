/** Rutas de primer nivel con página estática propia (no son perfiles públicos). */
const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
    'panel',
    'auth',
    'profesionales',
    'privacidad',
    'terminos',
    'cancelar',
    'nps',
]);

/** Perfil público / operator site: un solo segmento que no es ruta reservada. */
export function isAgendaOperatorSitePath(pathname: string): boolean {
    const path = pathname.split('?')[0]?.split('#')[0] ?? '/';
    if (path === '/') return false;

    const segments = path.split('/').filter(Boolean);
    if (segments.length !== 1) return false;

    return !RESERVED_TOP_LEVEL_SEGMENTS.has(segments[0]!.toLowerCase());
}

/** Header/footer de marketing SimpleAgenda (no aplica a landing ni panel). */
export function shouldShowAgendaMarketplaceChrome(pathname: string): boolean {
    const path = pathname.split('?')[0]?.split('#')[0] ?? '/';
    if (isAgendaOperatorSitePath(pathname)) return false;
    if (path === '/panel' || path.startsWith('/panel/')) return false;
    if (path.startsWith('/nps/')) return false;
    return true;
}
