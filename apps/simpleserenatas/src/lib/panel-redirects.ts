import {
    legacyQueryToPanelPath,
    resolveCanonicalMarketplaceRedirect,
    resolveCanonicalMiNegocioRedirect,
    resolveGrupoQueryRedirect,
    resolveNestedPanelRedirect,
} from '@/lib/panel-routes';

export type PanelRedirectOptions = {
    preferOwnerSolicitudes?: boolean;
};

/** Resuelve la primera redirección canónica del panel (o legacy `?section=` fuera de `/panel`). */
export function resolvePanelRedirect(
    pathname: string,
    search: string,
    options?: PanelRedirectOptions,
): string | null {
    const nestedTarget = resolveNestedPanelRedirect(pathname);
    if (nestedTarget) return nestedTarget;

    const marketplaceTarget = resolveCanonicalMarketplaceRedirect(pathname, search);
    if (marketplaceTarget) return marketplaceTarget;

    const miNegocioTarget = resolveCanonicalMiNegocioRedirect(pathname, search);
    if (miNegocioTarget) return miNegocioTarget;

    const grupoTarget = resolveGrupoQueryRedirect(pathname, search);
    if (grupoTarget) return grupoTarget;

    if (!pathname.startsWith('/panel')) {
        return legacyQueryToPanelPath(search, options);
    }

    return null;
}
