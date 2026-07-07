import type { Section } from '@/context/serenata-context';
import { type AccountTab, normalizeAccountTab } from '@/lib/account-tab';
import type { MarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { marketplaceRequestDraftQuery, publicSerenataRequestQuery } from '@/lib/marketplace-request-draft';
import { marketplaceCatalogHref, parseMarketplaceSearchParams } from '@/lib/marketplace-search';
import { publicMariachiPath } from '@/lib/public-mariachi-routes';
import { type MiNegocioTab, isMiNegocioTab, miNegocioTabFromSearch, normalizeMiNegocioTab } from '@/lib/mi-negocio-tab';

/** Slug URL → sección interna del panel. */
export const PANEL_SLUG_TO_SECTION: Record<string, Section> = {
    inicio: 'home',
    home: 'home',
    grupos: 'mariachis',
    mariachis: 'mariachis',
    grupo: 'grupo',
    solicitar: 'solicitar',
    contratar: 'mariachis',
    serenatas: 'serenatas',
    guardados: 'guardados',
    eventos: 'serenatas',
    musica: 'serenatas',
    solicitudes: 'solicitudes',
    'mi-negocio': 'mi-negocio',
    'mi-grupo': 'mi-negocio',
    publicar: 'mi-negocio',
    servicios: 'mi-negocio',
    groups: 'mi-negocio',
    jornadas: 'mi-negocio',
    invitaciones: 'invitations',
    invitations: 'invitations',
    agenda: 'agenda',
    mapa: 'map',
    map: 'map',
    finanzas: 'finanzas',
    estadisticas: 'estadisticas',
    publicidad: 'publicidad',
    perfil: 'profile',
    profile: 'profile',
    'mi-cuenta': 'profile',
    marketplace: 'mariachis',
    explorar: 'mariachis',
    'nuevo-evento': 'mariachis',
    notificaciones: 'home',
    mensajes: 'mensajes',
};

/** Sección → slug canónico en `/panel/{slug}`. */
export const SECTION_TO_PANEL_SLUG: Record<Section, string> = {
    home: '',
    grupos: 'mariachis',
    mariachis: 'mariachis',
    grupo: 'grupo',
    solicitar: 'solicitar',
    contratar: 'mariachis',
    serenatas: 'serenatas',
    guardados: 'guardados',
    solicitudes: 'solicitudes',
    'mi-negocio': 'mi-negocio',
    servicios: 'mi-negocio',
    groups: 'mi-negocio',
    invitations: 'invitaciones',
    agenda: 'agenda',
    map: 'mapa',
    finanzas: 'finanzas',
    estadisticas: 'estadisticas',
    publicidad: 'publicidad',
    profile: 'mi-cuenta',
    mensajes: 'mensajes',
};

const ALL_SECTIONS = new Set<string>(Object.keys(SECTION_TO_PANEL_SLUG));

export function isPanelSection(value: string | null | undefined): value is Section {
    return Boolean(value && ALL_SECTIONS.has(value));
}

/** Ruta canónica de Mi Negocio con sub-ruta. */
export function panelMiNegocioHref(tab: MiNegocioTab = 'datos'): string {
    const path = '/panel/mi-negocio';
    if (tab === 'datos') return path;
    return `${path}/${tab}`;
}

/** Slug del grupo en `/panel/grupo/{slug}`. */
export function groupSlugFromPanelPath(pathname: string): string | null {
    const match = pathname.match(/^\/panel\/grupo\/([^/?#]+)/);
    if (!match?.[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

/** Perfil público del mariachi (antes `/panel/grupo/{slug}`). */
export function panelGroupHref(slug: string): string {
    return publicMariachiPath(slug);
}

export function sectionFromPanelPath(pathname: string): Section | null {
    if (pathname === '/panel' || pathname === '/panel/') return 'home';
    if (groupSlugFromPanelPath(pathname)) return 'grupo';
    const match = pathname.match(/^\/panel\/([^/?#]+)/);
    if (!match) return null;
    return PANEL_SLUG_TO_SECTION[match[1]] ?? null;
}

/** Pathname efectivo para resaltar nav: URL del router o sección si la URL aún no actualizó. */
export function resolvePanelActivePathname(routerPathname: string, section: Section): string {
    const sectionPath = panelPathFromSection(section);
    if (!routerPathname.startsWith('/panel')) return sectionPath;

    const routerBase = routerPathname.split('?')[0]?.split('#')[0] ?? routerPathname;
    const sectionBase = sectionPath.split('?')[0]?.split('#')[0] ?? sectionPath;

    if (routerBase.length >= sectionBase.length) return routerPathname;
    return sectionPath;
}

export function isMiNegocioPanelSection(section: Section): boolean {
    return section === 'mi-negocio' || section === 'servicios' || section === 'groups';
}

export function isAccountPanelSection(section: Section): boolean {
    return section === 'profile';
}

/** Secciones cuyo shell ya aplica `container-app` (no usar `PanelPageFrame` con padding). */
export function usesOwnPanelPageShell(section: Section): boolean {
    return isMiNegocioPanelSection(section) || isAccountPanelSection(section);
}

/** Secciones cuyo contenido ya trae `container-app` propio (p. ej. `PanelMessagesInbox`). */
export function skipsPanelPageFrame(section: Section): boolean {
    return usesOwnPanelPageShell(section) || section === 'mensajes' || section === 'publicidad';
}

export function panelPathFromSection(section: Section, groupSlug?: string | null): string {
    if (section === 'grupo' && groupSlug) {
        return panelGroupHref(groupSlug);
    }
    if (isMiNegocioPanelSection(section)) {
        return '/panel/mi-negocio';
    }
    const slug = SECTION_TO_PANEL_SLUG[section];
    return slug ? `/panel/${slug}` : '/panel';
}

export function panelSectionHref(
    section: Section,
    query?: Record<string, string | null | undefined>,
): string {
    if (section === 'mi-negocio' || section === 'servicios' || section === 'groups') {
        const tabParam = query?.tab;
        const tab: MiNegocioTab =
            section === 'servicios'
                ? 'servicios'
                : section === 'groups'
                  ? 'grupos'
                  : normalizeMiNegocioTab(tabParam ?? null) ?? 'datos';
        return panelMiNegocioHref(tab);
    }

    const grupoSlug = query?.grupo;
    const path =
        section === 'grupo' && grupoSlug
            ? panelPathFromSection(section, grupoSlug)
            : panelPathFromSection(section);
    if (!query) return path;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (key === 'grupo' && section === 'grupo') continue;
        if (value != null && value !== '') params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

/** Perfil público con query para abrir el modal de solicitud (`servicio`). */
export function panelSolicitarHref(draft?: MarketplaceRequestDraftRef | null): string {
    if (!draft) return panelSectionHref('solicitar');
    const params = new URLSearchParams(publicSerenataRequestQuery(draft.serviceId, draft.date));
    return `${publicMariachiPath(draft.groupSlug)}?${params.toString()}`;
}

/** Compat: `/panel/solicitar?grupo=&servicio=` (redirige vía `SerenataRequestDeepLink`). */
export function panelSolicitarLegacyHref(draft: MarketplaceRequestDraftRef): string {
    return panelSectionHref('solicitar', marketplaceRequestDraftQuery(draft));
}

export function profilePanelHref(accountTab?: AccountTab): string {
    return panelSectionHref('profile', accountTab ? { account_tab: accountTab } : undefined);
}

/** Pestaña de Mi Negocio según sub-ruta, slug legacy o query `tab`. */
export function miNegocioTabFromPanelPath(pathname: string, search: string): MiNegocioTab {
    // Sub-ruta directa: /panel/mi-negocio/{tab}
    const subRouteMatch = pathname.match(/^\/panel\/mi-negocio\/([^/?#]+)/);
    if (subRouteMatch?.[1]) {
        const sub = normalizeMiNegocioTab(subRouteMatch[1]);
        if (sub) return sub;
    }
    // Slugs legacy
    const match = pathname.match(/^\/panel\/([^/?#]+)/);
    const slug = match?.[1];
    if (slug === 'disponibilidad' || slug === 'horarios') return 'horarios';
    if (slug === 'servicios') return 'servicios';
    if (slug === 'jornadas' || slug === 'groups') return 'grupos';
    if (slug === 'publicar') return 'configuraciones';
    return miNegocioTabFromSearch(search);
}

const PANEL_MARKETPLACE_SLUGS = new Set([
    'grupos',
    'mariachis',
    'contratar',
    'marketplace',
    'explorar',
    'nuevo-evento',
]);

/** Slugs legacy del marketplace cliente → catálogo público `/mariachis`. */
export function resolveCanonicalMarketplaceRedirect(pathname: string, search: string): string | null {
    const match = pathname.replace(/\/$/, '').match(/^\/panel\/([^/?#]+)$/);
    if (!match?.[1] || !PANEL_MARKETPLACE_SLUGS.has(match[1])) return null;
    const qs = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(qs);
    return marketplaceCatalogHref(parseMarketplaceSearchParams(params));
}

/** Redirige slugs legacy de Mi Negocio / servicios a la ruta canónica. */
export function resolveCanonicalMiNegocioRedirect(pathname: string, search: string): string | null {
    // Already on a valid sub-route or canonical path — no redirect needed
    if (/^\/panel\/mi-negocio(\/[^/?#]*)?$/.test(pathname)) return null;
    const match = pathname.match(/^\/panel\/([^/?#]+)/);
    if (!match) return null;
    const slug = match[1];
    const legacySlugs = new Set(['mi-grupo', 'publicar', 'disponibilidad', 'horarios', 'servicios', 'jornadas', 'groups']);
    if (!legacySlugs.has(slug)) return null;
    return panelMiNegocioHref(miNegocioTabFromPanelPath(pathname, search));
}

export type LegacyQueryToPanelOptions = {
    /** Dueño/operación: `section=serenatas` → solicitudes en lugar de mis serenatas cliente. */
    preferOwnerSolicitudes?: boolean;
};

/** `/?section=…` → ruta `/panel/…` conservando query (account_tab, checkout, etc.). */
export function legacyQueryToPanelPath(search: string, options?: LegacyQueryToPanelOptions): string | null {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const rawSection = params.get('section');
    const sectionRaw = rawSection === 'mi-grupo' ? 'mi-negocio' : rawSection;
    if (sectionRaw && PANEL_MARKETPLACE_SLUGS.has(sectionRaw)) {
        params.delete('section');
        return marketplaceCatalogHref(parseMarketplaceSearchParams(params));
    }

    const section = sectionRaw === 'grupos' ? 'mariachis' : sectionRaw;
    if (!section || !isPanelSection(section)) return null;

    const grupo = params.get('grupo');
    params.delete('section');
    if (section === 'grupo' && grupo) {
        params.delete('grupo');
        const path = panelGroupHref(grupo);
        const qs = params.toString();
        return qs ? `${path}?${qs}` : path;
    }

    if (section === 'mi-negocio' || section === 'servicios' || section === 'groups') {
        const tab =
            section === 'servicios' ? 'servicios' : section === 'groups' ? 'grupos' : miNegocioTabFromSearch(params.toString());
        params.delete('tab');
        const qs = params.toString();
        const path = panelMiNegocioHref(tab);
        return qs ? `${path}?${qs}` : path;
    }

    if (section === 'serenatas') {
        const serenataId = params.get('serenata');
        params.delete('serenata');
        const query: Record<string, string | null | undefined> = {};
        params.forEach((value, key) => {
            query[key] = value;
        });
        if (serenataId) query.serenata = serenataId;
        const targetSection = options?.preferOwnerSolicitudes ? 'solicitudes' : 'serenatas';
        return panelSectionHref(targetSection, Object.keys(query).length > 0 ? query : undefined);
    }

    const path = panelPathFromSection(section);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

/** `?grupo=` en rutas legacy del panel → perfil público `/{slug}`. */
export function resolveGrupoQueryRedirect(pathname: string, search: string): string | null {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const grupo = params.get('grupo')?.trim();
    if (!grupo) return null;

    params.delete('grupo');
    const qs = params.toString();
    const target = panelGroupHref(grupo);
    const withQuery = qs ? `${target}?${qs}` : target;

    if (pathname === '/panel/grupo' || pathname === '/panel/grupo/') {
        return withQuery;
    }

    const section = sectionFromPanelPath(pathname);
    if (section === 'mariachis' || section === 'grupos' || section === 'grupo') {
        return withQuery;
    }

    return null;
}

/** Rutas anidadas legacy de Mi cuenta → `/panel/mi-cuenta?account_tab=…`. */
const LEGACY_MI_CUENTA_NESTED: Record<string, AccountTab> = {
    '/panel/mi-cuenta/timezone': 'ubicacion',
    '/panel/mi-cuenta/direcciones': 'ubicacion',
    '/panel/mi-cuenta/ubicacion': 'ubicacion',
    '/panel/mi-cuenta/seguridad': 'security',
    '/panel/mi-cuenta/notificaciones': 'notifications',
    '/panel/mi-cuenta/apariencia': 'appearance',
    '/panel/mi-cuenta/suscripcion': 'subscription',
    '/panel/mi-cuenta/integraciones': 'integrations',
    '/panel/mi-cuenta/datos-personales': 'data',
};

export function resolveNestedPanelRedirect(pathname: string): string | null {
    const normalized = pathname.replace(/\/$/, '');
    const tab = LEGACY_MI_CUENTA_NESTED[normalized];
    if (!tab) return null;
    return profilePanelHref(tab);
}

export function accountTabFromSearch(search: string): AccountTab | null {
    try {
        const tab = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('account_tab');
        return normalizeAccountTab(tab);
    } catch {
        return null;
    }
}

function panelSearchRecord(search: string): Record<string, string | null | undefined> {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const record: Record<string, string | null | undefined> = {};
    params.forEach((value, key) => {
        record[key] = value;
    });
    return record;
}

/** Slug legacy de primer nivel (`/panel/perfil`, `/panel/map`, …) → ruta canónica. */
export function resolveCanonicalPanelSlugRedirect(pathname: string, search: string): string | null {
    const normalized = pathname.replace(/\/$/, '');
    if (normalized === '/panel') return null;

    const match = normalized.match(/^\/panel\/([^/?#]+)$/);
    if (!match?.[1]) return null;

    const section = PANEL_SLUG_TO_SECTION[match[1]];
    if (!section) return null;

    const canonical = panelSectionHref(section, panelSearchRecord(search));
    const canonicalUrl = new URL(canonical, 'http://localhost');
    const canonicalPath = canonicalUrl.pathname.replace(/\/$/, '') || '/panel';
    const currentQs = search.startsWith('?') ? search.slice(1) : search;

    if (canonicalPath === normalized) {
        const canonicalQs = canonicalUrl.search.startsWith('?') ? canonicalUrl.search.slice(1) : '';
        if (canonicalQs === currentQs) return null;
        if (!canonicalQs && !currentQs) return null;
    }

    return canonical;
}
