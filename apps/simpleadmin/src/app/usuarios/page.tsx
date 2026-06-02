'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    IconCircleDot, IconSearch, IconUserPlus,
} from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, sendAdminUsersBulkEmail, type AdminSessionUser, type AdminUserListItem, type AdminVerticalType } from '@/lib/api';
import { PanelButton, PanelList, PanelListHeader, PanelListRow, PanelNotice, PanelStatCard, PanelStatusBadge } from '@simple/ui/panel';
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
            {(adminUser) => <UsuariosContent adminUser={adminUser} />}
        </AdminProtectedPage>
    );
}

function UsuariosContent({ adminUser }: { adminUser: AdminSessionUser }) {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [bulkMessage, setBulkMessage] = useState<string | null>(null);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkSending, setBulkSending] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkSubject, setBulkSubject] = useState('Actualización de tu cuenta Simple');
    const [bulkBody, setBulkBody] = useState('');
    const [bulkActionUrl, setBulkActionUrl] = useState('https://simpleserenatas.app/onboarding');
    const [query, setQuery] = useState('');
    const [verticalFilter, setVerticalFilter] = useState<VerticalFilter>('all');
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
    const scope = normalizeAdminScope(searchParams.get('scope'));
    const canBulkEmail = adminUser.role === 'superadmin';

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
        if (scope === 'serenatas') return items.filter((item) => item.likelySignupVertical === 'serenatas' || item.verticalSignals?.some((signal) => signal.vertical === 'serenatas') || Boolean(item.serenatas || item.subscriptions?.serenatas));
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

    useEffect(() => {
        setSelectedIds((current) => current.filter((id) => filtered.some((item) => item.id === id)));
    }, [filtered]);

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

    const selectedUsers = useMemo(
        () => filtered.filter((item) => selectedIds.includes(item.id)),
        [filtered, selectedIds],
    );
    const visibleSelectionChecked = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

    function toggleSelectAllVisible() {
        if (visibleSelectionChecked) {
            setSelectedIds((current) => current.filter((id) => !filtered.some((item) => item.id === id)));
            return;
        }
        setSelectedIds((current) => [...new Set([...current, ...filtered.map((item) => item.id)])]);
    }

    async function handleBulkEmail() {
        if (!canBulkEmail || selectedIds.length === 0) return;
        setBulkSending(true);
        setBulkError(null);
        setBulkMessage(null);
        const result = await sendAdminUsersBulkEmail(selectedIds, {
            subject: bulkSubject,
            message: bulkBody,
            actionUrl: bulkActionUrl,
            actionLabel: 'Ir a mi cuenta',
        });
        setBulkSending(false);
        if (!result.ok) {
            setBulkError(result.error ?? 'No pudimos enviar los correos.');
            return;
        }
        setBulkBody('');
        setSelectedIds([]);
        setBulkMessage(`Correos enviados: ${result.sent ?? 0}${result.skipped ? ` · omitidos: ${result.skipped}` : ''}.`);
    }

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
            {bulkMessage ? (
                <div className="mt-4">
                    <PanelNotice tone="success">{bulkMessage}</PanelNotice>
                </div>
            ) : null}
            {bulkError ? (
                <div className="mt-4">
                    <PanelNotice tone="error">{bulkError}</PanelNotice>
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
                    {canBulkEmail && selectedIds.length > 0 ? (
                        <div className="mb-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        {selectedUsers.length} usuarios seleccionados
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Envío manual auditado. Máximo 50 destinatarios por envío.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="self-start rounded-button px-2.5 py-1.5 text-xs font-medium"
                                    style={{ color: 'var(--fg-secondary)' }}
                                    onClick={() => setSelectedIds([])}
                                >
                                    Limpiar selección
                                </button>
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(180px,280px)_1fr_minmax(180px,280px)_auto] lg:items-end">
                                <label className="space-y-1 text-sm">
                                    <span style={{ color: 'var(--fg-muted)' }}>Asunto</span>
                                    <input className="form-input h-10" value={bulkSubject} onChange={(event) => setBulkSubject(event.target.value)} disabled={bulkSending} />
                                </label>
                                <label className="space-y-1 text-sm">
                                    <span style={{ color: 'var(--fg-muted)' }}>Mensaje</span>
                                    <input
                                        className="form-input h-10"
                                        value={bulkBody}
                                        onChange={(event) => setBulkBody(event.target.value)}
                                        disabled={bulkSending}
                                        placeholder="Mensaje para los usuarios seleccionados..."
                                    />
                                </label>
                                <label className="space-y-1 text-sm">
                                    <span style={{ color: 'var(--fg-muted)' }}>Link</span>
                                    <input className="form-input h-10" value={bulkActionUrl} onChange={(event) => setBulkActionUrl(event.target.value)} disabled={bulkSending} />
                                </label>
                                <PanelButton
                                    variant="secondary"
                                    className="h-10"
                                    onClick={() => void handleBulkEmail()}
                                    disabled={bulkSending || selectedIds.length === 0 || selectedIds.length > 50 || bulkSubject.trim().length < 3 || bulkBody.trim().length < 5}
                                >
                                    {bulkSending ? 'Enviando...' : 'Enviar'}
                                </PanelButton>
                            </div>
                        </div>
                    ) : null}
                    <PanelList>
                        <PanelListHeader className="grid-cols-[40px_minmax(280px,1.4fr)_170px_180px_150px_170px]">
                            <span>
                                {canBulkEmail ? (
                                    <input
                                        type="checkbox"
                                        checked={visibleSelectionChecked}
                                        onChange={toggleSelectAllVisible}
                                        aria-label="Seleccionar usuarios visibles"
                                    />
                                ) : null}
                            </span>
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
                                    selected={selectedIds.includes(user.id)}
                                    selectable={canBulkEmail}
                                    onSelectedChange={(checked) =>
                                        setSelectedIds((current) =>
                                            checked
                                                ? [...new Set([...current, user.id])]
                                                : current.filter((id) => id !== user.id),
                                        )
                                    }
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
    selected,
    selectable,
    onSelectedChange,
}: {
    user: AdminUserListItem;
    scope: ReturnType<typeof normalizeAdminScope>;
    selected: boolean;
    selectable: boolean;
    onSelectedChange: (checked: boolean) => void;
}) {
    return (
        <article className="grid gap-4 px-4 py-4 md:grid-cols-[40px_minmax(280px,1.4fr)_170px_180px_150px_170px] md:items-center">
            <div>
                {selectable ? (
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => onSelectedChange(event.target.checked)}
                        aria-label={`Seleccionar ${user.name}`}
                    />
                ) : null}
            </div>
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
