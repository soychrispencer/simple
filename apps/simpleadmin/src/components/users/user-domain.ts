import type { AdminSessionUser, AdminUserRole, AdminUserSnapshot, AdminUserStatus, AdminVertical } from '@/lib/api';

export type VerticalFilter = 'all' | AdminVertical;
export type StatusFilter = 'all' | AdminUserStatus;
export type PrimaryVerticalValue = 'none' | 'autos' | 'propiedades' | 'agenda';
export type SubscriptionStatusValue = 'active' | 'cancelled' | 'expired';
export type SerenatasProfile = 'client' | 'musician' | 'owner';

export type AdminCapabilities = {
    manageUsers: boolean;
    deleteUsers: boolean;
    sendEmail: boolean;
    manageSubscriptions: boolean;
    manageSerenatas: boolean;
};

export function capabilitiesFor(user: AdminSessionUser): AdminCapabilities {
    const unrestricted = user.role === 'superadmin';
    return {
        manageUsers: unrestricted,
        deleteUsers: unrestricted,
        sendEmail: unrestricted,
        manageSubscriptions: unrestricted,
        manageSerenatas: unrestricted,
    };
}

export const VERTICAL_OPTIONS: Array<{ value: VerticalFilter; label: string }> = [
    { value: 'all', label: 'Todas las plataformas' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
];

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'verified', label: 'Verificados' },
    { value: 'active', label: 'Activos' },
    { value: 'suspended', label: 'Suspendidos' },
];

export const ROLE_OPTIONS: Array<{ value: AdminUserRole; label: string }> = [
    { value: 'user', label: 'Usuario' },
    { value: 'admin', label: 'Admin' },
    { value: 'superadmin', label: 'Superadmin' },
];

export const PRIMARY_VERTICAL_OPTIONS: Array<{ value: PrimaryVerticalValue; label: string }> = [
    { value: 'none', label: 'Sin plataforma base' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
];

export const SUBSCRIPTION_STATUS_OPTIONS: Array<{ value: SubscriptionStatusValue; label: string }> = [
    { value: 'active', label: 'Activa' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'expired', label: 'Expirada' },
];

export const PLAN_OPTIONS: Record<AdminVertical, Array<{ value: string; label: string }>> = {
    agenda: [{ value: 'free', label: 'Gratis' }, { value: 'pro', label: 'Pro' }],
    autos: [{ value: 'free', label: 'Gratis' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }],
    propiedades: [{ value: 'free', label: 'Gratis' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }],
    serenatas: [{ value: 'free', label: 'Gratis' }, { value: 'pro', label: 'Pro' }],
};

export const SERENATAS_PROFILE_OPTIONS: Array<{ value: SerenatasProfile; label: string }> = [
    { value: 'client', label: 'Cliente' },
    { value: 'musician', label: 'Músico' },
    { value: 'owner', label: 'Dueño' },
];

export function formatDateTime(value: number | null): string {
    if (!value) return 'Sin registro';
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function statusLabel(status: AdminUserStatus): string {
    if (status === 'verified') return 'Verificado';
    if (status === 'suspended') return 'Suspendido';
    return 'Activo';
}

export function roleLabel(role: AdminUserRole): string {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Usuario';
}

export function verticalLabel(vertical: AdminVertical | null): string {
    return VERTICAL_OPTIONS.find((option) => option.value === vertical)?.label ?? 'Sin plataforma';
}

export function activitySummary(user: AdminUserSnapshot): string {
    return user.lastLoginAt ? `Último ingreso ${formatDateTime(user.lastLoginAt)}` : `Registro ${formatDateTime(user.createdAt)}`;
}

export function platformSummary(user: AdminUserSnapshot): string {
    return user.platformAccesses.length ? user.platformAccesses.map((access) => access.label).join(', ') : 'Sin plataforma activada';
}

export function statusTone(status: AdminUserStatus): 'success' | 'warning' | 'danger' {
    if (status === 'verified') return 'success';
    if (status === 'suspended') return 'danger';
    return 'warning';
}

export function getSubscriptionSummary(user: AdminUserSnapshot, vertical: AdminVertical): string {
    const item = user.subscriptions?.[vertical];
    if (!item) return 'Sin plan';
    const plan = vertical === 'agenda' && 'plan' in item ? item.plan : 'planId' in item ? item.planId : null;
    return `${plan || 'free'}${item.status ? ` · ${item.status}` : ''}`;
}

export function toDateInputValue(value: unknown): string {
    if (typeof value !== 'string' || !value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function dateInputToIso(value: string): string | null {
    return value ? new Date(`${value}T23:59:59.000Z`).toISOString() : null;
}
