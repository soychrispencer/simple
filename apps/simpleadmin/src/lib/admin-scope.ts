export type AdminScope = 'all' | 'autos' | 'propiedades' | 'plataforma';

export const ADMIN_SCOPE_ITEMS: Array<{ key: AdminScope; label: string }> = [
    { key: 'all', label: 'General' },
    { key: 'autos', label: 'SimpleAutos' },
    { key: 'propiedades', label: 'SimplePropiedades' },
    { key: 'plataforma', label: 'Plataforma' },
];

export function normalizeAdminScope(value: string | null | undefined): AdminScope {
    if (value === 'autos' || value === 'propiedades' || value === 'plataforma') return value;
    return 'all';
}

export function adminScopeLabel(scope: AdminScope): string {
    return ADMIN_SCOPE_ITEMS.find((item) => item.key === scope)?.label ?? 'General';
}

export function withAdminScope(pathname: string, scope: AdminScope): string {
    if (scope === 'all') return pathname;
    return `${pathname}?scope=${scope}`;
}
