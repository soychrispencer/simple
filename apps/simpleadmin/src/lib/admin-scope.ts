export type AdminScope = 'all' | 'serenatas' | 'agenda' | 'autos' | 'propiedades';
export type AdminPanelView = 'global' | 'verticales' | 'operacion';

export const ADMIN_SCOPE_ITEMS: Array<{ key: AdminScope; label: string }> = [
    { key: 'all', label: 'Todas las verticales' },
    { key: 'serenatas', label: 'Serenatas' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'autos', label: 'Autos' },
    { key: 'propiedades', label: 'Propiedades' },
];

export const ADMIN_VIEW_ITEMS: Array<{ key: AdminPanelView; label: string }> = [
    { key: 'global', label: 'Global' },
    { key: 'verticales', label: 'Verticales' },
    { key: 'operacion', label: 'Operación' },
];

export function normalizeAdminScope(value: string | null | undefined): AdminScope {
    if (value === 'serenatas' || value === 'agenda' || value === 'autos' || value === 'propiedades') return value;
    return 'all';
}

export function normalizeAdminView(value: string | null | undefined, scope: AdminScope): AdminPanelView {
    if (value === 'global' || value === 'verticales' || value === 'operacion') return value;
    return scope === 'all' ? 'global' : 'verticales';
}

export function adminScopeLabel(scope: AdminScope): string {
    return ADMIN_SCOPE_ITEMS.find((item) => item.key === scope)?.label ?? 'Todas las verticales';
}

export function withAdminScope(pathname: string, scope: AdminScope, view?: AdminPanelView): string {
    const effectiveView = view ?? (scope === 'all' ? 'global' : 'verticales');
    if (effectiveView === 'global' && scope === 'all') return pathname;
    const params = new URLSearchParams();
    params.set('view', effectiveView);
    if (scope !== 'all') params.set('scope', scope);
    return `${pathname}?${params.toString()}`;
}
