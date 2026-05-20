import type { Section } from '@/context/serenata-context';
import { CONFIG_SLUG_TO_ACCOUNT_TAB, type AccountTab, isAccountTab, normalizeAccountTab } from '@/lib/account-tab';
import type { MarketplaceRequestDraftRef } from '@/lib/marketplace-request-draft';
import { marketplaceRequestDraftQuery } from '@/lib/marketplace-request-draft';
import { type MiNegocioTab, isMiNegocioTab, miNegocioTabFromSearch } from '@/lib/mi-negocio-tab';

/** Slug URL → sección interna del panel. */
export const PANEL_SLUG_TO_SECTION: Record<string, Section> = {
    inicio: 'home',
    home: 'home',
    grupos: 'mariachis',
    mariachis: 'mariachis',
    grupo: 'grupo',
    solicitar: 'solicitar',
    contratar: 'contratar',
    serenatas: 'serenatas',
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
    cuenta: 'profile',
    perfil: 'profile',
    profile: 'profile',
    'mi-cuenta': 'profile',
    configuracion: 'profile',
    marketplace: 'mariachis',
    explorar: 'mariachis',
    'nuevo-evento': 'mariachis',
    notificaciones: 'home',
};

/** Sección → slug canónico en `/panel/{slug}`. */
export const SECTION_TO_PANEL_SLUG: Record<Section, string> = {
    home: '',
    grupos: 'mariachis',
    mariachis: 'mariachis',
    grupo: 'grupo',
    solicitar: 'solicitar',
    contratar: 'contratar',
    serenatas: 'serenatas',
    solicitudes: 'solicitudes',
    'mi-negocio': 'mi-negocio',
    servicios: 'mi-negocio',
    groups: 'mi-negocio',
    invitations: 'invitaciones',
    agenda: 'agenda',
    map: 'mapa',
    profile: 'cuenta',
};

const ALL_SECTIONS = new Set<string>(Object.keys(SECTION_TO_PANEL_SLUG));

export function isPanelSection(value: string | null | undefined): value is Section {
    return Boolean(value && ALL_SECTIONS.has(value));
}

/** Ruta canónica de Mi Negocio con pestaña opcional. */
export function panelMiNegocioHref(tab: MiNegocioTab = 'perfil'): string {
    const path = '/panel/mi-negocio';
    if (tab === 'perfil') return path;
    return `${path}?tab=${tab}`;
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

export function panelGroupHref(slug: string): string {
    return `/panel/grupo/${encodeURIComponent(slug)}`;
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

export function panelPathFromSection(section: Section, groupSlug?: string | null): string {
    if (section === 'grupo' && groupSlug) {
        return panelGroupHref(groupSlug);
    }
    if (section === 'mi-negocio' || section === 'servicios' || section === 'groups') {
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
                  : isMiNegocioTab(tabParam)
                    ? tabParam
                    : 'perfil';
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

/** `/panel/solicitar` con draft en query (`grupo` + `servicio`). */
export function panelSolicitarHref(draft?: MarketplaceRequestDraftRef | null): string {
    return panelSectionHref('solicitar', draft ? marketplaceRequestDraftQuery(draft) : undefined);
}

export function profilePanelHref(accountTab?: AccountTab): string {
    return panelSectionHref('profile', accountTab ? { account_tab: accountTab } : undefined);
}

/** Pestaña de Mi Negocio según slug legacy o query `tab`. */
export function miNegocioTabFromPanelPath(pathname: string, search: string): MiNegocioTab {
    const match = pathname.match(/^\/panel\/([^/?#]+)/);
    const slug = match?.[1];
    if (slug === 'disponibilidad') return 'disponibilidad';
    if (slug === 'servicios') return 'servicios';
    if (slug === 'jornadas' || slug === 'groups') return 'grupos';
    return miNegocioTabFromSearch(search);
}

/** `/panel/grupos` (marketplace legacy) → `/panel/mariachis`. */
export function resolveCanonicalMarketplaceRedirect(pathname: string, search: string): string | null {
    const base = pathname.replace(/\/$/, '');
    if (base !== '/panel/grupos') return null;
    const qs = search.startsWith('?') ? search : search ? `?${search}` : '';
    return `/panel/mariachis${qs}`;
}

/** Redirige slugs legacy de Mi Negocio / servicios a la ruta canónica. */
export function resolveCanonicalMiNegocioRedirect(pathname: string, search: string): string | null {
    const match = pathname.match(/^\/panel\/([^/?#]+)/);
    if (!match) return null;
    const slug = match[1];
    const legacySlugs = new Set(['mi-grupo', 'publicar', 'disponibilidad', 'servicios', 'jornadas', 'groups']);
    if (!legacySlugs.has(slug)) return null;
    return panelMiNegocioHref(miNegocioTabFromPanelPath(pathname, search));
}

/** `/?section=…` → ruta `/panel/…` conservando query (account_tab, checkout, etc.). */
export function legacyQueryToPanelPath(search: string): string | null {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const rawSection = params.get('section');
    const sectionRaw = rawSection === 'mi-grupo' ? 'mi-negocio' : rawSection;
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
        return panelSectionHref('solicitudes', Object.keys(query).length > 0 ? query : undefined);
    }

    const path = panelPathFromSection(section);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

/** `?grupo=` en `/panel/grupo` o `/panel/grupos` → `/panel/grupo/{slug}`. */
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

/** Rutas anidadas legacy (`/panel/cuenta/datos`, `/panel/configuracion/seguridad`) → `/panel/cuenta?…`. */
export function resolveNestedPanelRedirect(pathname: string): string | null {
    const configMatch = pathname.match(/^\/panel\/configuracion\/([^/]+)$/);
    if (configMatch) {
        const tab = CONFIG_SLUG_TO_ACCOUNT_TAB[configMatch[1]];
        if (tab) return profilePanelHref(tab);
        return panelSectionHref('profile');
    }

    const cuentaMatch = pathname.match(/^\/panel\/cuenta\/([^/]+)$/);
    if (cuentaMatch) {
        const tab = CONFIG_SLUG_TO_ACCOUNT_TAB[cuentaMatch[1]] ?? (isAccountTab(cuentaMatch[1]) ? cuentaMatch[1] : null);
        if (tab) return profilePanelHref(tab);
    }

    return null;
}

export function accountTabFromSearch(search: string): AccountTab | null {
    try {
        const tab = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('account_tab');
        return normalizeAccountTab(tab);
    } catch {
        return null;
    }
}
