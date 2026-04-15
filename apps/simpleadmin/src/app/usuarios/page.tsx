'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconAlertCircle, IconCheck, IconCreditCard, IconSearch, IconShield, IconTrash } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, type AdminUserListItem } from '@/lib/api';
import { PanelButton, PanelCard, PanelNotice, PanelStatCard } from '@simple/ui';
import { adminScopeLabel, normalizeAdminScope } from '@/lib/admin-scope';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function UsuariosPage() {
    return (
        <AdminProtectedPage>
            {() => <UsuariosContent />}
        </AdminProtectedPage>
    );
}

type ActionMode = 'role' | 'subscription' | 'delete' | null;

function UsuariosContent() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roleValue, setRoleValue] = useState<AdminUserListItem['role'] | ''>('');
    const scope = normalizeAdminScope(searchParams.get('scope'));

    useEffect(() => {
        let active = true;
        const run = async () => {
            const next: AdminUserListItem[] = await fetchAdminUsers();
            if (!active) return;
            setItems(next);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    const scopedItems = useMemo(() => {
        if (scope === 'agenda') return items.filter((item) => item.agendaListings > 0);
        if (scope === 'autos') return items.filter((item) => item.autosListings > 0);
        if (scope === 'propiedades') return items.filter((item) => item.propiedadesListings > 0);
        return items;
    }, [items, scope]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return scopedItems;
        return scopedItems.filter((item) => item.name.toLowerCase().includes(normalized) || item.email.toLowerCase().includes(normalized));
    }, [query, scopedItems]);

    const stats = useMemo(() => {
        const total = scopedItems.length;
        const verified = scopedItems.filter((item) => item.status === 'verified').length;
        const admins = scopedItems.filter((item) => item.role === 'admin' || item.role === 'superadmin').length;
        const suspended = scopedItems.filter((item) => item.status === 'suspended').length;
        const listingLabel =
            scope === 'agenda'
                ? 'Publicaciones agenda'
                : scope === 'autos'
                    ? 'Publicaciones autos'
                    : scope === 'propiedades'
                        ? 'Publicaciones propiedades'
                        : 'Administradores';
        const listingValue =
            scope === 'agenda'
                ? scopedItems.reduce((sum, item) => sum + item.agendaListings, 0)
                : scope === 'autos'
                    ? scopedItems.reduce((sum, item) => sum + item.autosListings, 0)
                    : scope === 'propiedades'
                        ? scopedItems.reduce((sum, item) => sum + item.propiedadesListings, 0)
                        : admins;

        return [
            { label: 'Usuarios', value: total.toLocaleString('es-CL'), meta: `${filtered.length.toLocaleString('es-CL')} visibles` },
            { label: 'Verificados', value: verified.toLocaleString('es-CL'), meta: 'Cuentas habilitadas' },
            { label: listingLabel, value: listingValue.toLocaleString('es-CL'), meta: scope === 'all' ? 'Cuentas con privilegios' : 'Inventario ligado al scope' },
            { label: 'Suspendidos', value: suspended.toLocaleString('es-CL'), meta: 'Acceso bloqueado' },
        ];
    }, [filtered.length, scope, scopedItems]);

    const handleOpenAction = (mode: ActionMode, user: AdminUserListItem) => {
        setSelectedUser(user);
        setActionMode(mode);
        setMessage(null);
        if (mode === 'role') setRoleValue(user.role);
    };

    const handleCloseAction = () => {
        setActionMode(null);
        setSelectedUser(null);
        setRoleValue('');
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

            const updated: AdminUserListItem[] = items.map((user): AdminUserListItem =>
                user.id === selectedUser.id ? { ...user, role: roleValue } : user
            );
            setItems(updated);
            setMessage({ type: 'success', text: `Rol actualizado a ${roleValue}` });
            setTimeout(handleCloseAction, 1200);
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
                setMessage({ type: 'error', text: data.error || 'Error al eliminar usuario' });
                return;
            }

            setItems(items.filter((user) => user.id !== selectedUser.id));
            setMessage({ type: 'success', text: 'Usuario eliminado' });
            setTimeout(handleCloseAction, 1200);
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveSubscriptions = async (subscriptions: AdminUserListItem['subscriptions']) => {
        if (!selectedUser) return;

        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/subscriptions`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptions }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                setMessage({ type: 'error', text: data.error || 'Error al actualizar suscripciones' });
                return;
            }

            const updated: AdminUserListItem[] = items.map((user): AdminUserListItem =>
                user.id === selectedUser.id ? { ...user, subscriptions } : user
            );
            setItems(updated);
            setMessage({ type: 'success', text: 'Suscripciones actualizadas' });
            setTimeout(handleCloseAction, 1200);
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Usuarios</h1>
                <p className="type-page-subtitle mt-1">Gestión de cuentas para {adminScopeLabel(scope).toLowerCase()}, con foco en acceso y operación real.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} meta={item.meta} />
                ))}
            </div>

            <PanelCard size="md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Base de usuarios</h2>
                        <p className="type-page-subtitle mt-1">Consulta el estado de cada cuenta y ejecuta acciones de control dentro de {adminScopeLabel(scope).toLowerCase()}.</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar usuario..."
                            className="form-input form-input-has-leading-icon h-10 text-sm"
                        />
                    </div>
                </div>

                {loading ? <PanelNotice tone="neutral">Cargando usuarios...</PanelNotice> : null}
                {!loading && filtered.length === 0 ? (
                    <PanelNotice tone="neutral">
                        {scope === 'all' ? 'No encontramos usuarios para ese filtro.' : `No encontramos usuarios para ${adminScopeLabel(scope)}.`}
                    </PanelNotice>
                ) : null}

                {!loading && filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((user) => (
                            <article
                                key={user.id}
                                className="rounded-xl border p-5 transition-colors hover:border-[var(--accent)]/30"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                {/* Row 1: Main Info & Actions */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                        <div
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                            style={{ background: 'var(--accent-subtle)', color: 'var(--fg)' }}
                                        >
                                            {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{user.name}</span>
                                                <RoleBadge role={user.role} />
                                                <StatusBadge status={user.status} />
                                            </div>
                                            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-secondary)' }}>{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <ActionButton
                                            onClick={() => handleOpenAction('role', user)}
                                            icon={<IconShield size={16} />}
                                            label="Rol"
                                        />
                                        <ActionButton
                                            onClick={() => handleOpenAction('subscription', user)}
                                            icon={<IconCreditCard size={16} />}
                                            label="Suscripción"
                                        />
                                        <ActionButton
                                            onClick={() => handleOpenAction('delete', user)}
                                            icon={<IconTrash size={16} />}
                                            label="Eliminar"
                                            variant="danger"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Stats Grid */}
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <StatItem label="Registro" value={new Date(user.createdAt).toLocaleDateString('es-CL')} />
                                    <StatItem label="Publicaciones" value={String(user.totalListings || 0)} />
                                    <StatItem label="Agenda" value={String(user.agendaListings || 0)} color="#8b5cf6" />
                                    <StatItem label="Autos" value={String(user.autosListings || 0)} color="#3b82f6" />
                                </div>

                                {/* Row 3: Subscriptions */}
                                {hasSubscriptions(user) && (
                                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {user.subscriptions?.agenda && <SubscriptionBadge vertical="Agenda" subscription={user.subscriptions.agenda} />}
                                            {user.subscriptions?.autos && <SubscriptionBadge vertical="Autos" subscription={user.subscriptions.autos} />}
                                            {user.subscriptions?.propiedades && <SubscriptionBadge vertical="Propiedades" subscription={user.subscriptions.propiedades} />}
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                ) : null}
            </PanelCard>

            {actionMode === 'role' && selectedUser ? (
                <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
                    <button
                        type="button"
                        aria-label="Cerrar modal"
                        onClick={handleCloseAction}
                        className="absolute inset-0"
                        style={{ background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(8px)' }}
                    />
                    <div
                        className="relative z-1 w-full max-w-md rounded-[28px] border p-6"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)' }}
                    >
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Cambiar rol</h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Actualiza el nivel de acceso de <strong style={{ color: 'var(--fg)' }}>{selectedUser.name}</strong>.
                        </p>

                        <div className="mt-5 space-y-2">
                            <label className="block text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>
                                Nuevo rol
                            </label>
                            <select
                                value={roleValue}
                                onChange={(event) => setRoleValue(event.target.value as AdminUserListItem['role'])}
                                className="form-select h-11 text-sm"
                            >
                                <option value="user">Usuario</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Superadmin</option>
                            </select>
                        </div>

                        {message ? <FeedbackNotice message={message} className="mt-4" /> : null}

                        <div className="mt-5 flex gap-2">
                            <PanelButton variant="secondary" className="flex-1" onClick={handleCloseAction} disabled={isProcessing}>
                                Cancelar
                            </PanelButton>
                            <PanelButton
                                className="flex-1"
                                onClick={handleChangeRole}
                                disabled={isProcessing || roleValue === selectedUser.role}
                            >
                                {isProcessing ? 'Actualizando...' : 'Actualizar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            ) : null}

            {actionMode === 'delete' && selectedUser ? (
                <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
                    <button
                        type="button"
                        aria-label="Cerrar modal"
                        onClick={handleCloseAction}
                        className="absolute inset-0"
                        style={{ background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(8px)' }}
                    />
                    <div
                        className="relative z-1 w-full max-w-md rounded-[28px] border p-6"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)' }}
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                                style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'rgb(244, 63, 94)' }}
                            >
                                <IconAlertCircle size={20} stroke={1.9} />
                            </div>
                            <div>
                                <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Eliminar usuario</h2>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Esta acción elimina de forma definitiva a <strong style={{ color: 'var(--fg)' }}>{selectedUser.name}</strong> y sus datos relacionados.
                                </p>
                            </div>
                        </div>

                        {message ? <FeedbackNotice message={message} className="mt-4" /> : null}

                        <div className="mt-5 flex gap-2">
                            <PanelButton variant="secondary" className="flex-1" onClick={handleCloseAction} disabled={isProcessing}>
                                Cancelar
                            </PanelButton>
                            <PanelButton className="flex-1" onClick={handleDeleteUser} disabled={isProcessing}>
                                {isProcessing ? 'Eliminando...' : 'Eliminar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            ) : null}

            {actionMode === 'subscription' && selectedUser ? (
                <SubscriptionModal
                    user={selectedUser}
                    onClose={handleCloseAction}
                    onSave={handleSaveSubscriptions}
                    isProcessing={isProcessing}
                    message={message}
                />
            ) : null}
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        superadmin: { bg: 'rgba(244, 63, 94, 0.12)', color: 'rgb(244, 63, 94)', label: 'Superadmin' },
        admin: { bg: 'rgba(59, 130, 246, 0.12)', color: 'rgb(59, 130, 246)', label: 'Admin' },
        user: { bg: 'var(--bg-muted)', color: 'var(--fg-secondary)', label: 'Usuario' },
    };
    const cfg = config[role] || config.user;
    return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        verified: { bg: 'rgba(34, 197, 94, 0.12)', color: 'rgb(34, 197, 94)', label: 'Verificado' },
        active: { bg: 'rgba(59, 130, 246, 0.12)', color: 'rgb(59, 130, 246)', label: 'Activo' },
        suspended: { bg: 'rgba(244, 63, 94, 0.12)', color: 'rgb(244, 63, 94)', label: 'Suspendido' },
    };
    const cfg = config[status] || config.active;
    return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </span>
    );
}

function StatPill({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
    return (
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--bg-muted)' }}>
            <span>{icon}</span>
            <span style={{ color: 'var(--fg-muted)' }}>{label}:</span>
            <span className="font-semibold" style={{ color: accent || 'var(--fg)' }}>{value}</span>
        </div>
    );
}

function ActionButton({
    onClick,
    icon,
    label,
    variant = 'default',
}: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    variant?: 'default' | 'danger';
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <span className="text-sm font-medium" style={{ color: color || 'var(--fg)' }}>{value}</span>
        </div>
    );
}

function hasSubscriptions(user: AdminUserListItem): boolean {
    return !!(user.subscriptions?.agenda || user.subscriptions?.autos || user.subscriptions?.propiedades);
}

function hasAnyListing(user: AdminUserListItem): boolean {
    return (user.agendaListings > 0 || user.autosListings > 0 || user.propiedadesListings > 0);
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-22.5">
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
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

function SubscriptionBadge({ vertical, subscription }: { vertical: string; subscription: any }) {
    const planLabel = subscription.plan || subscription.planName || 'Free';
    const statusColor =
        subscription.status === 'active' || subscription.status === 'pro'
            ? 'rgba(34, 197, 94, 0.12)'
            : subscription.status === 'expired'
                ? 'rgba(244, 63, 94, 0.12)'
                : 'var(--bg-muted)';
    const statusTextColor =
        subscription.status === 'active' || subscription.status === 'pro'
            ? 'rgb(34, 197, 94)'
            : subscription.status === 'expired'
                ? 'rgb(244, 63, 94)'
                : 'var(--fg-muted)';

    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: statusColor, color: statusTextColor }}
        >
            {vertical}: {planLabel}
        </span>
    );
}

function SubscriptionModal({
    user,
    onClose,
    onSave,
    isProcessing,
    message,
}: {
    user: AdminUserListItem;
    onClose: () => void;
    onSave: (subscriptions: AdminUserListItem['subscriptions']) => void;
    isProcessing: boolean;
    message: { type: 'success' | 'error'; text: string } | null;
}) {
    const [subscriptions, setSubscriptions] = useState<AdminUserListItem['subscriptions']>(user.subscriptions || {
        agenda: { plan: 'free', expiresAt: null, status: 'free' },
        autos: null,
        propiedades: null,
    });

    const updateAgenda = (plan: 'free' | 'pro', expiresAt: string | null) => {
        setSubscriptions((prev) => ({
            ...prev,
            agenda: { plan, expiresAt, status: plan === 'pro' ? 'active' : 'free' },
        }));
    };

    const updateAutos = (planId: string, planName: string) => {
        setSubscriptions((prev) => ({
            ...prev,
            autos: { planId, planName, status: planId === 'free' ? 'free' : 'active', expiresAt: null },
        }));
    };

    const updatePropiedades = (planId: string, planName: string) => {
        setSubscriptions((prev) => ({
            ...prev,
            propiedades: { planId, planName, status: planId === 'free' ? 'free' : 'active', expiresAt: null },
        }));
    };

    return (
        <div className="fixed inset-0 z-80 flex items-center justify-center px-4 py-5">
            <button
                type="button"
                aria-label="Cerrar modal"
                onClick={onClose}
                className="absolute inset-0"
                style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            />
            <div
                className="relative z-1 w-full max-w-md rounded-xl border p-0 overflow-hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)' }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Gestionar Suscripciones</h2>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {user.name} · {user.email}
                    </p>
                </div>

                <div className="p-5 space-y-4">
                    {/* SimpleAgenda */}
                    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                                <h3 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>SimpleAgenda</h3>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                color: subscriptions?.agenda?.plan === 'pro' ? '#8b5cf6' : 'var(--fg-muted)',
                                background: subscriptions?.agenda?.plan === 'pro' ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-muted)'
                            }}>
                                {subscriptions?.agenda?.plan === 'pro' ? 'Pro' : 'Free'}
                            </span>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateAgenda('free', null)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                                        subscriptions?.agenda?.plan === 'free'
                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--fg)]'
                                            : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50'
                                    }`}
                                >
                                    Free
                                </button>
                                <button
                                    onClick={() => updateAgenda('pro', subscriptions?.agenda?.expiresAt || null)}
                                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                                        subscriptions?.agenda?.plan === 'pro'
                                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--fg)]'
                                            : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]/50'
                                    }`}
                                >
                                    Pro
                                </button>
                            </div>
                            {subscriptions?.agenda?.plan === 'pro' && (
                                <div className="pt-2">
                                    <label className="text-xs block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Expiración (opcional)</label>
                                    <input
                                        type="date"
                                        value={subscriptions?.agenda?.expiresAt || ''}
                                        onChange={(e) => updateAgenda('pro', e.target.value || null)}
                                        className="form-input w-full text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SimpleAutos */}
                    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                                <h3 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>SimpleAutos</h3>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                color: subscriptions?.autos?.planId && subscriptions?.autos?.planId !== 'free' ? '#3b82f6' : 'var(--fg-muted)',
                                background: subscriptions?.autos?.planId && subscriptions?.autos?.planId !== 'free' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-muted)'
                            }}>
                                {subscriptions?.autos?.planName || 'Sin plan'}
                            </span>
                        </div>
                        <select
                            value={subscriptions?.autos?.planId || 'none'}
                            onChange={(e) => {
                                const planId = e.target.value;
                                if (planId === 'none') {
                                    setSubscriptions((prev) => ({ ...prev, autos: null }));
                                } else {
                                    const planNames: Record<string, string> = {
                                        free: 'Gratuito',
                                        pro: 'Profesional',
                                        enterprise: 'Empresarial',
                                    };
                                    updateAutos(planId, planNames[planId] || planId);
                                }
                            }}
                            className="form-select w-full text-sm"
                        >
                            <option value="none">Sin suscripción</option>
                            <option value="free">Gratuito</option>
                            <option value="pro">Profesional</option>
                            <option value="enterprise">Empresarial</option>
                        </select>
                    </div>

                    {/* SimplePropiedades */}
                    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                                <h3 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>SimplePropiedades</h3>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                color: subscriptions?.propiedades?.planId && subscriptions?.propiedades?.planId !== 'free' ? '#10b981' : 'var(--fg-muted)',
                                background: subscriptions?.propiedades?.planId && subscriptions?.propiedades?.planId !== 'free' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-muted)'
                            }}>
                                {subscriptions?.propiedades?.planName || 'Sin plan'}
                            </span>
                        </div>
                        <select
                            value={subscriptions?.propiedades?.planId || 'none'}
                            onChange={(e) => {
                                const planId = e.target.value;
                                if (planId === 'none') {
                                    setSubscriptions((prev) => ({ ...prev, propiedades: null }));
                                } else {
                                    const planNames: Record<string, string> = {
                                        free: 'Gratuito',
                                        pro: 'Profesional',
                                        enterprise: 'Empresarial',
                                    };
                                    updatePropiedades(planId, planNames[planId] || planId);
                                }
                            }}
                            className="form-select w-full text-sm"
                        >
                            <option value="none">Sin suscripción</option>
                            <option value="free">Gratuito</option>
                            <option value="pro">Profesional</option>
                            <option value="enterprise">Empresarial</option>
                        </select>
                    </div>
                </div>

                {message ? (
                    <div className="px-5 pb-2">
                        <FeedbackNotice message={message} />
                    </div>
                ) : null}

                {/* Footer */}
                <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                    <PanelButton variant="secondary" className="flex-1" onClick={onClose} disabled={isProcessing}>
                        Cancelar
                    </PanelButton>
                    <PanelButton
                        className="flex-1"
                        onClick={() => onSave(subscriptions)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Guardando...' : 'Guardar cambios'}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}
