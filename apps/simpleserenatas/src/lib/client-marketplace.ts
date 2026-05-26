/** Catálogo público de mariachis (fuera del panel, como el buscador en Autos/Propiedades). */
export const CLIENT_MARKETPLACE_HREF = '/mariachis';

export function isClientMarketplaceHref(href: string): boolean {
    const normalized = href.split('#')[0]?.split('?')[0] ?? href;
    return normalized === CLIENT_MARKETPLACE_HREF;
}
