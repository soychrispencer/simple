'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    IconCircleDot, IconSearch, IconUserPlus,
} from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, type AdminUserListItem, type AdminVerticalType } from '@/lib/api';
import { PanelList, PanelListHeader, PanelListRow, PanelNotice, PanelStatCard, PanelStatusBadge } from '@simple/ui/panel';
import { adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';

type VerticalFilter = 'all' | AdminVerticalType | 'unknown';
type ProviderFilter = 'all' | 'google' | 'local';
type AgendaSubscription = NonNullable<NonNullable<AdminUserListItem['subscriptions']>['agenda']>;

const VERTICAL_FILTERS: Array<{ value: VerticalFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'serenatas', label: 'Serenatas' },
    { value: 'agenda', label: 'Agenda' },
    { value: 'autos', label: 'Autos' },
    { value: 'propiedades', label: 'Propiedades' },
    { value: 'unknown', label: 'Sin señal' },
];

const PROVIDER_FILTERS: Array<{ value: ProviderFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'google', label: 'Google' },
    { value: 'local', label: 'Email' },
];

export default function UsuariosPage() {
    return (
        <AdminProtectedPage>
            {() => <UsuariosContent />}
        </AdminProtectedPage>
    );
}

function UsuariosContent() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [verticalFilter, setVerticalFilter] = useState<VerticalFilter>('all');
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
    const scope = normalizeAdminScope(searchParams.get('scope'));

    useEffect(() => {
        let active = true;
        const run = async () => {
            setLoading(true);
            const result = await fetchAdminUsers();
            if (!active) return;
            setItems(result.items);
            setLoadError(result.error ?? null);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    const scopedItems = useMemo(() => {
        if (scope === 'agenda') return items.filter((item) => item.likelySignupVertical === 'agenda' || item.agendaListings > 0);
        if (scope === 'autos') return items.filter((item) => item.likelySignupVertical === 'autos' || item.autosListings > 0);
        if (scope === 'propiedades') return items.filter((item) => item.likelySignupVertical === 'propiedades' || item.propiedadesListings > 0);
        return items;
    }, [items, scope]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return scopedItems.filter((item) => {
            if (verticalFilter !== 'all') {
                if (verticalFilter === 'unknown') {
                    if (item.likelySignupVertical || (item.verticalSignals?.length ?? 0) > 0) return false;
                } else if (item.likelySignupVertical !== verticalFilter && !item.verticalSignals?.some((signal) => signal.vertical === verticalFilter)) {
                    return false;
                }
            }
            if (providerFilter !== 'all' && item.provider !== providerFilter) return false;
            if (!normalized) return true;
            return (
                item.name.toLowerCase().includes(normalized)
                || item.email.toLowerCase().includes(normalized)
                || (item.signupSourceLabel ?? '').toLowerCase().includes(normalized)
                || (item.signupOrigin ?? '').toLowerCase().includes(normalized)
            );
        });
    }, [providerFilter, query, scopedItems, verticalFilter]);

    const recentUsers = useMemo(() => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return scopedItems.filter((item) => item.createdAt >= sevenDaysAgo);
    }, [scopedItems]);

    const stats = useMemo(() => {
        const countByVertical = (vertical: AdminVerticalType) =>
            scopedItems.filter((item) => item.likelySignupVertical === vertical || item.verticalSignals?.some((signal) => signal.vertical === vertical)).length;
        return [
            { label: 'Usuarios', value: scopedItems.length.toLocaleString('es-CL'), meta: `${filtered.length.toLocaleString('es-CL')} visibles` },
            { label: 'Nuevos 7 días', value: recentUsers.length.toLocaleString('es-CL'), meta: 'Altas recientes' },
            { label: 'Serenatas', value: countByVertical('serenatas').toLocaleString('es-CL'), meta: 'Alta o actividad' },
            { label: 'Sin señal', value: scopedItems.filter((item) => !item.likelySignupVertical && (item.verticalSignals?.length ?? 0) === 0).length.toLocaleString('es-CL'), meta: 'Revisar origen' },
        ];
    }, [filtered.length, recentUsers.length, scopedItems]);

    return (
        <div className="container-app panel-page py-7">
            <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                        {adminScopeLabel(scope)}
                    </p>
                    <h1 className="mt-1 type-page-title" style={{ color: 'var(--fg)' }}>Usuarios</h1>
                    <p className="type-page-subtitle mt-1 max-w-4xl">
                        Vista limpia de cuentas: estado global, suscripción y acceso a detalle por vertical.
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                    <IconUserPlus size={17} />
                    <span>{recentUsers.length.toLocaleString('es-CL')} registros nuevos en 7 días · Acciones avanzadas en Detalle</span>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} meta={item.meta} />
                ))}
            </div>

            <section className="mt-5 border-y py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full xl:max-w-md">
                        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar por nombre, correo u origen..."
                            className="form-input form-input-has-leading-icon h-11 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <SegmentedControl
                            label="Vertical"
                            items={VERTICAL_FILTERS}
                            value={verticalFilter}
                            onChange={(value) => setVerticalFilter(value as VerticalFilter)}
                        />
                        <SegmentedControl
                            label="Acceso"
                            items={PROVIDER_FILTERS}
                            value={providerFilter}
                            onChange={(value) => setProviderFilter(value as ProviderFilter)}
                        />
                    </div>
                </div>
            </section>

            {loadError ? (
                <div className="mt-4">
                    <PanelNotice tone="error">{loadError}</PanelNotice>
                </div>
            ) : null}
            {loading ? (
                <div className="mt-4">
                    <PanelNotice tone="neutral">Cargando usuarios...</PanelNotice>
                </div>
            ) : null}

            {!loading && filtered.length === 0 ? (
                <div className="mt-4">
                    <PanelNotice tone="neutral">No encontramos usuarios para los filtros actuales.</PanelNotice>
                </div>
            ) : null}

            {!loading && filtered.length > 0 ? (
                <section className="mt-5">
                    <PanelList>
                        <PanelListHeader className="grid-cols-[minmax(280px,1.4fr)_170px_180px_150px_170px]">
                            <span>Usuario</span>
                            <span>Registro</span>
                            <span>Vertical</span>
                            <span>Salud</span>
                            <span className="text-right">Acciones</span>
                        </PanelListHeader>
                        {filtered.map((user, index) => (
                            <PanelListRow key={user.id} divider={index > 0}>
                                <UserRow
                                    user={user}
                                    scope={scope}
                                />
                            </PanelListRow>
                        ))}
                    </PanelList>
                </section>
            ) : null}
        </div>
    );
}

function UserRow({
    user,
    scope,
}: {
    user: AdminUserListItem;
    scope: ReturnType<typeof normalizeAdminScope>;
}) {
    return (
        <article className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(280px,1.4fr)_170px_180px_150px_170px] md:items-center">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                    {initials(user.name)}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{user.name}</h2>
                        <PanelStatusBadge label={roleLabel(user.role)} tone={user.role === 'superadmin' ? 'danger' : user.role === 'admin' ? 'info' : 'neutral'} />
                        <PanelStatusBadge label={statusLabel(user.status)} tone={user.status === 'suspended' ? 'danger' : 'success'} />
                    </div>
                    <p className="mt-0.5 truncate text-sm" style={{ color: 'var(--fg-secondary)' }}>{user.email}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {user.provider === 'google' ? 'Google' : 'Email'} · {user.signupSourceLabel ?? 'Origen historico no guardado'}
                    </p>
                </div>
            </div>

            <MetaBlock
                label="Registro"
                value={formatDate(user.createdAt)}
                meta={user.lastLoginAt ? `Ultimo login ${formatDate(user.lastLoginAt)}` : 'Sin login registrado'}
            />

            <div className="flex flex-col gap-1">
                <PanelStatusBadge
                    label={verticalLabel(user.likelySignupVertical ?? 'serenatas')}
                    tone="info"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {user.verticalConfidence === 'direct' ? 'Directa' : user.verticalConfidence === 'inferred' ? 'Inferida por actividad' : 'No determinada'}
                </p>
                {user.likelySignupVertical === 'agenda' || user.subscriptions?.agenda ? (
                    <p className="mt-1 text-xs font-medium" style={{ color: agendaSubscriptionColor(user.subscriptions?.agenda?.status) }}>
                        {agendaSubscriptionLabel(user.subscriptions?.agenda)}
                    </p>
                ) : null}
            </div>

            <div>
                <div className="flex items-center gap-2">
                    <IconCircleDot size={15} style={{ color: realnessColor(user.realness?.score ?? 0) }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.realness?.label ?? 'Sin diagnostico'}</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Score {user.realness?.score ?? 0}/100
                </p>
            </div>

            <div className="flex items-center justify-start gap-1 md:justify-end">
                <Link href={withAdminScope(`/usuarios/${user.id}`, scope)} className="rounded-button px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]" style={{ color: 'var(--fg-secondary)' }}>
                    Gestionar detalle
                </Link>
            </div>
        </article>
    );
}

function SegmentedControl({
    label,
    items,
    value,
    onChange,
}: {
    label: string;
    items: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <div className="flex flex-wrap gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)' }}>
                {items.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange(item.value)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{
                            background: value === item.value ? 'var(--fg)' : 'transparent',
                            color: value === item.value ? 'var(--bg)' : 'var(--fg-secondary)',
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function MetaBlock({ label, value, meta }: { label: string; value: string; meta: string }) {
    return (
        <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-muted)' }}>{meta}</p>
        </div>
    );
}

function initials(name: string) {
    return name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatDate(value: number) {
    return new Date(value).toLocaleDateString('es-CL');
}

function agendaSubscriptionLabel(subscription: AgendaSubscription | null | undefined) {
    if (!subscription) return 'Agenda: sin perfil';
    if (subscription.plan === 'free') return 'Agenda: Gratis';
    if (subscription.status === 'expired') return 'Agenda: Pro vencido';
    return 'Agenda: Pro activo';
}

function agendaSubscriptionColor(status?: string) {
    if (status === 'active') return 'rgb(34, 197, 94)';
    if (status === 'expired') return 'rgb(245, 158, 11)';
    return 'var(--fg-muted)';
}

function roleLabel(role: string) {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Usuario';
}

function statusLabel(status: string) {
    if (status === 'verified') return 'Verificado';
    if (status === 'suspended') return 'Suspendido';
    return 'Activo';
}

function verticalLabel(vertical: AdminVerticalType) {
    const labels: Record<AdminVerticalType, string> = {
        autos: 'Autos',
        propiedades: 'Propiedades',
        agenda: 'Agenda',
        serenatas: 'Serenatas',
    };
    return labels[vertical];
}

function realnessColor(score: number) {
    if (score >= 65) return 'rgb(34, 197, 94)';
    if (score >= 35) return 'rgb(245, 158, 11)';
    return 'rgb(148, 163, 184)';
}
