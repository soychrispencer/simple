'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    IconAlertCircle, IconCheck, IconCircleDot, IconCreditCard, IconSearch, IconShield, IconTrash, IconUserPlus, } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, updateAdminUserSubscriptions, type AdminUserListItem, type AdminVerticalType } from '@/lib/api';
import { PanelButton } from '@simple/ui/panel';
import { PanelNotice, PanelStatCard } from '@simple/ui/panel';
import { adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';
import { API_BASE } from '@simple/config';

type ActionMode = 'role' | 'subscription' | 'delete' | null;
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
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roleValue, setRoleValue] = useState<AdminUserListItem['role'] | ''>('');
    const [agendaPlanValue, setAgendaPlanValue] = useState<'free' | 'pro'>('free');
    const [agendaExpiresAtValue, setAgendaExpiresAtValue] = useState('');
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
            { label: 'Nuevos 7 dias', value: recentUsers.length.toLocaleString('es-CL'), meta: 'Altas recientes' },
            { label: 'Serenatas', value: countByVertical('serenatas').toLocaleString('es-CL'), meta: 'Alta o actividad' },
            { label: 'Sin señal', value: scopedItems.filter((item) => !item.likelySignupVertical && (item.verticalSignals?.length ?? 0) === 0).length.toLocaleString('es-CL'), meta: 'Revisar origen' },
        ];
    }, [filtered.length, recentUsers.length, scopedItems]);

    const handleOpenAction = (mode: ActionMode, user: AdminUserListItem) => {
        setSelectedUser(user);
        setActionMode(mode);
        setMessage(null);
        if (mode === 'role') setRoleValue(user.role);
        if (mode === 'subscription') {
            setAgendaPlanValue(user.subscriptions?.agenda?.plan ?? 'free');
            setAgendaExpiresAtValue(toDateInputValue(user.subscriptions?.agenda?.expiresAt ?? null));
        }
    };

    const handleCloseAction = () => {
        setActionMode(null);
        setSelectedUser(null);
        setRoleValue('');
        setAgendaPlanValue('free');
        setAgendaExpiresAtValue('');
        setMessage(null);
    };

    const handleChangeRole = async () => {
        if (!selectedUser || !roleValue || roleValue === selectedUser.role) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/role`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: roleValue }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setMessage({ type: 'error', text: data.error || 'Error al cambiar rol' });
                return;
            }

            setItems(items.map((user) => (user.id === selectedUser.id ? { ...user, role: roleValue } : user)));
            setMessage({ type: 'success', text: `Rol actualizado a ${roleValue}` });
            setTimeout(handleCloseAction, 900);
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const detail = typeof data.detail === 'string' && data.detail.trim().length > 0
                    ? ` (${data.detail})`
                    : '';
                setMessage({ type: 'error', text: `${data.error || 'Error al eliminar usuario'}${detail}` });
                return;
            }

            setItems(items.filter((user) => user.id !== selectedUser.id));
            setMessage({ type: 'success', text: 'Usuario eliminado' });
            setTimeout(handleCloseAction, 900);
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveSubscription = async () => {
        if (!selectedUser) return;

        const nextSubscriptions: AdminUserListItem['subscriptions'] = {
            ...(selectedUser.subscriptions ?? {}),
            agenda: {
                plan: agendaPlanValue,
                status: agendaPlanValue === 'free' ? 'free' : 'active',
                expiresAt: agendaPlanValue === 'pro' && agendaExpiresAtValue ? new Date(`${agendaExpiresAtValue}T23:59:59`).toISOString() : null,
            },
        };

        setIsProcessing(true);
        const result = await updateAdminUserSubscriptions(selectedUser.id, nextSubscriptions);
        if (!result.ok) {
            setMessage({ type: 'error', text: result.error ?? 'No pudimos actualizar la suscripción.' });
            setIsProcessing(false);
            return;
        }

        setItems((current) => current.map((user) => (
            user.id === selectedUser.id ? { ...user, subscriptions: nextSubscriptions } : user
        )));
        setMessage({ type: 'success', text: 'Suscripción Agenda actualizada' });
        setIsProcessing(false);
        setTimeout(handleCloseAction, 900);
    };

    return (
        <div className="container-app panel-page py-7">
            <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--fg-muted)' }}>
                        {adminScopeLabel(scope)}
                    </p>
                    <h1 className="mt-1 type-page-title" style={{ color: 'var(--fg)' }}>Usuarios</h1>
                    <p className="type-page-subtitle mt-1 max-w-4xl">
                        Control de altas por vertical, origen de registro, proveedor de acceso y señales reales de actividad.
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                    <IconUserPlus size={17} />
                    <span>{recentUsers.length.toLocaleString('es-CL')} registros nuevos en 7 dias</span>
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
                <section className="mt-5 overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <div className="hidden grid-cols-[minmax(260px,1.3fr)_160px_160px_minmax(220px,1fr)_170px_170px] gap-4 border-b px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] xl:grid" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                        <span>Usuario</span>
                        <span>Alta</span>
                        <span>Vertical</span>
                        <span>Señales</span>
                        <span>Realidad</span>
                        <span className="text-right">Acciones</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {filtered.map((user) => (
                            <UserRow
                                key={user.id}
                                user={user}
                                scope={scope}
                                onRole={() => handleOpenAction('role', user)}
                                onSubscription={() => handleOpenAction('subscription', user)}
                                onDelete={() => handleOpenAction('delete', user)}
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            {actionMode === 'role' && selectedUser ? (
                <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
                    <button type="button" aria-label="Cerrar modal" onClick={handleCloseAction} className="absolute inset-0 admin-modal-backdrop" />
                    <div className="relative z-1 w-full max-w-md rounded-card border p-6 admin-modal-surface">
                        <h2 className="type-section-title text-(--fg)">Cambiar rol</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Actualiza el nivel de acceso de <strong style={{ color: 'var(--fg)' }}>{selectedUser.name}</strong>.
                        </p>
                        <select
                            value={roleValue}
                            onChange={(event) => setRoleValue(event.target.value as AdminUserListItem['role'])}
                            className="form-select mt-5 h-11 text-sm"
                        >
                            <option value="user">Usuario</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                        </select>
                        {message ? <FeedbackNotice message={message} className="mt-4" /> : null}
                        <div className="mt-5 flex gap-2">
                            <PanelButton variant="secondary" className="flex-1" onClick={handleCloseAction} disabled={isProcessing}>Cancelar</PanelButton>
                            <PanelButton className="flex-1" onClick={handleChangeRole} disabled={isProcessing || roleValue === selectedUser.role}>
                                {isProcessing ? 'Actualizando...' : 'Actualizar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            ) : null}

            {actionMode === 'delete' && selectedUser ? (
                <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
                    <button type="button" aria-label="Cerrar modal" onClick={handleCloseAction} className="absolute inset-0 admin-modal-backdrop" />
                    <div className="relative z-1 w-full max-w-md rounded-card border p-6 admin-modal-surface">
                        <div className="flex items-start gap-3">
                            <div className="admin-modal-danger-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                                <IconAlertCircle size={20} stroke={1.9} />
                            </div>
                            <div>
                                <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Eliminar usuario</h2>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Esta acción elimina de forma definitiva a <strong style={{ color: 'var(--fg)' }}>{selectedUser.name}</strong>.
                                </p>
                            </div>
                        </div>
                        {message ? <FeedbackNotice message={message} className="mt-4" /> : null}
                        <div className="mt-5 flex gap-2">
                            <PanelButton variant="secondary" className="flex-1" onClick={handleCloseAction} disabled={isProcessing}>Cancelar</PanelButton>
                            <PanelButton className="flex-1" onClick={handleDeleteUser} disabled={isProcessing}>
                                {isProcessing ? 'Eliminando...' : 'Eliminar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            ) : null}

            {actionMode === 'subscription' && selectedUser ? (
                <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
                    <button type="button" aria-label="Cerrar modal" onClick={handleCloseAction} className="absolute inset-0 admin-modal-backdrop" />
                    <div className="relative z-1 w-full max-w-lg rounded-card border p-6 admin-modal-surface">
                        <h2 className="type-section-title text-(--fg)">Suscripción Agenda</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Controla manualmente el plan de <strong style={{ color: 'var(--fg)' }}>{selectedUser.name}</strong> en SimpleAgenda.
                        </p>
                        <div className="mt-5 grid gap-4">
                            <label className="grid gap-2">
                                <span className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Plan</span>
                                <select
                                    value={agendaPlanValue}
                                    onChange={(event) => setAgendaPlanValue(event.target.value as 'free' | 'pro')}
                                    className="form-select h-11 text-sm"
                                >
                                    <option value="free">Gratis</option>
                                    <option value="pro">Profesional</option>
                                </select>
                            </label>
                            <label className="grid gap-2">
                                <span className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Vence</span>
                                <input
                                    type="date"
                                    value={agendaExpiresAtValue}
                                    disabled={agendaPlanValue === 'free'}
                                    onChange={(event) => setAgendaExpiresAtValue(event.target.value)}
                                    className="form-input h-11 text-sm disabled:opacity-50"
                                />
                            </label>
                            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                                Gratis: 5 pacientes y 10 citas mensuales. Pro: agenda completa, integraciones y WhatsApp automático.
                            </div>
                        </div>
                        {message ? <FeedbackNotice message={message} className="mt-4" /> : null}
                        <div className="mt-5 flex gap-2">
                            <PanelButton variant="secondary" className="flex-1" onClick={handleCloseAction} disabled={isProcessing}>Cancelar</PanelButton>
                            <PanelButton className="flex-1" onClick={handleSaveSubscription} disabled={isProcessing}>
                                {isProcessing ? 'Guardando...' : 'Guardar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function UserRow({
    user,
    scope,
    onRole,
    onSubscription,
    onDelete,
}: {
    user: AdminUserListItem;
    scope: ReturnType<typeof normalizeAdminScope>;
    onRole: () => void;
    onSubscription: () => void;
    onDelete: () => void;
}) {
    const signals = user.verticalSignals ?? [];
    return (
        <article className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(260px,1.3fr)_160px_160px_minmax(220px,1fr)_170px_170px] xl:items-center xl:px-5">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                    {initials(user.name)}
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{user.name}</h2>
                        <SmallBadge label={roleLabel(user.role)} tone={user.role === 'superadmin' ? 'danger' : user.role === 'admin' ? 'info' : 'neutral'} />
                        <SmallBadge label={statusLabel(user.status)} tone={user.status === 'suspended' ? 'danger' : 'success'} />
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

            <div>
                <VerticalBadge vertical={user.likelySignupVertical ?? null} confidence={user.verticalConfidence ?? 'unknown'} />
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {user.verticalConfidence === 'direct' ? 'Directa' : user.verticalConfidence === 'inferred' ? 'Inferida por actividad' : 'No determinada'}
                </p>
                {user.likelySignupVertical === 'agenda' || user.subscriptions?.agenda ? (
                    <p className="mt-1 text-xs font-medium" style={{ color: agendaSubscriptionColor(user.subscriptions?.agenda?.status) }}>
                        {agendaSubscriptionLabel(user.subscriptions?.agenda)}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
                {signals.length > 0 ? signals.slice(0, 4).map((signal) => (
                    <SignalPill key={`${signal.source}-${signal.vertical}`} signal={signal} />
                )) : <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin publicaciones ni perfiles</span>}
                {signals.length > 4 ? <SmallBadge label={`+${signals.length - 4}`} tone="neutral" /> : null}
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

            <div className="flex items-center justify-start gap-1 xl:justify-end">
                <Link href={withAdminScope(`/usuarios/${user.id}`, scope)} className="rounded-button px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]" style={{ color: 'var(--fg-secondary)' }}>
                    Detalle
                </Link>
                <ActionButton onClick={onRole} icon={<IconShield size={16} />} label="Rol" />
                <ActionButton onClick={onSubscription} icon={<IconCreditCard size={16} />} label="Suscripción" />
                <ActionButton onClick={onDelete} icon={<IconTrash size={16} />} label="Eliminar" variant="danger" />
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

function VerticalBadge({ vertical, confidence }: { vertical: AdminVerticalType | null; confidence: string }) {
    const label = vertical ? verticalLabel(vertical) : 'Sin vertical';
    return (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: verticalColor(vertical, 0.12), color: verticalColor(vertical) }}>
            {label}{confidence === 'inferred' ? ' inferida' : ''}
        </span>
    );
}

function SignalPill({ signal }: { signal: NonNullable<AdminUserListItem['verticalSignals']>[number] }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: verticalColor(signal.vertical, 0.1), color: verticalColor(signal.vertical) }}>
            {signal.label}{signal.count > 1 ? ` (${signal.count})` : ''}
        </span>
    );
}

function SmallBadge({ label, tone }: { label: string; tone: 'neutral' | 'success' | 'danger' | 'info' }) {
    const colors = {
        neutral: ['var(--bg-muted)', 'var(--fg-secondary)'],
        success: ['rgba(34, 197, 94, 0.12)', 'rgb(34, 197, 94)'],
        danger: ['rgba(244, 63, 94, 0.12)', 'rgb(244, 63, 94)'],
        info: ['rgba(59, 130, 246, 0.12)', 'rgb(59, 130, 246)'],
    }[tone];
    return <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: colors[0], color: colors[1] }}>{label}</span>;
}

function ActionButton({
    onClick,
    icon,
    label,
    variant = 'default',
}: {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    variant?: 'default' | 'danger';
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium transition-colors ${
                variant === 'danger'
                    ? 'hover:bg-red-500/10 text-[var(--fg-muted)] hover:text-red-500'
                    : 'hover:bg-[var(--bg-muted)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
            title={label}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

function FeedbackNotice({
    message,
    className = '',
}: {
    message: { type: 'success' | 'error'; text: string };
    className?: string;
}) {
    return (
        <div
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${className}`.trim()}
            style={{
                background: message.type === 'error' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                color: message.type === 'error' ? 'rgb(244, 63, 94)' : 'rgb(34, 197, 94)',
            }}
        >
            {message.type === 'error' ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
            {message.text}
        </div>
    );
}

function initials(name: string) {
    return name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatDate(value: number) {
    return new Date(value).toLocaleDateString('es-CL');
}

function toDateInputValue(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
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

function verticalColor(vertical: AdminVerticalType | null, alpha?: number) {
    const rgb: Record<AdminVerticalType | 'unknown', string> = {
        serenatas: '225, 29, 72',
        agenda: '139, 92, 246',
        autos: '59, 130, 246',
        propiedades: '16, 185, 129',
        unknown: '148, 163, 184',
    };
    const value = rgb[vertical ?? 'unknown'];
    return alpha ? `rgba(${value}, ${alpha})` : `rgb(${value})`;
}

function realnessColor(score: number) {
    if (score >= 65) return 'rgb(34, 197, 94)';
    if (score >= 35) return 'rgb(245, 158, 11)';
    return 'rgb(148, 163, 184)';
}
