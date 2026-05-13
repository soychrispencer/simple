export type AdminScope = 'all' | 'agenda' | 'autos' | 'propiedades';

export const ADMIN_SCOPE_ITEMS: Array<{ key: AdminScope; label: string }> = [
    { key: 'all', label: 'General' },
    { key: 'agenda', label: 'SimpleAgenda' },
    { key: 'autos', label: 'SimpleAutos' },
    { key: 'propiedades', label: 'SimplePropiedades' },
];

export function normalizeAdminScope(value: string | null | undefined): AdminScope {
    if (value === 'agenda' || value === 'autos' || value === 'propiedades') return value;
    return 'all';
}

export function adminScopeLabel(scope: AdminScope): string {
    return ADMIN_SCOPE_ITEMS.find((item) => item.key === scope)?.label ?? 'General';
}

export function withAdminScope(pathname: string, scope: AdminScope): string {
    if (scope === 'all') return pathname;
    return `${pathname}?scope=${scope}`;
}
