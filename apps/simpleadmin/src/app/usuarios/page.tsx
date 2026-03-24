'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertCircle, IconCheck, IconSearch, IconShield, IconTrash } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, type AdminUserListItem } from '@/lib/api';
import { PanelButton, PanelCard, PanelNotice, PanelStatCard } from '@simple/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function UsuariosPage() {
    return (
        <AdminProtectedPage>
            {() => <UsuariosContent />}
        </AdminProtectedPage>
    );
}

type ActionMode = 'role' | 'delete' | null;

function UsuariosContent() {
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roleValue, setRoleValue] = useState<AdminUserListItem['role'] | ''>('');

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

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return items;
        return items.filter((item) => item.name.toLowerCase().includes(normalized) || item.email.toLowerCase().includes(normalized));
    }, [items, query]);

    const stats = useMemo(() => {
        const total = items.length;
        const verified = items.filter((item) => item.status === 'verified').length;
        const admins = items.filter((item) => item.role === 'admin' || item.role === 'superadmin').length;
        const suspended = items.filter((item) => item.status === 'suspended').length;

        return [
            { label: 'Usuarios', value: total.toLocaleString('es-CL'), meta: `${filtered.length.toLocaleString('es-CL')} visibles` },
            { label: 'Verificados', value: verified.toLocaleString('es-CL'), meta: 'Cuentas habilitadas' },
            { label: 'Administradores', value: admins.toLocaleString('es-CL'), meta: 'Admin y superadmin' },
            { label: 'Suspendidos', value: suspended.toLocaleString('es-CL'), meta: 'Acceso bloqueado' },
        ];
    }, [filtered.length, items]);

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

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Usuarios</h1>
                <p className="type-page-subtitle mt-1">Gestión centralizada de cuentas, roles y acceso administrativo.</p>
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
                        <p className="type-page-subtitle mt-1">Consulta el estado de cada cuenta y ejecuta acciones de control.</p>
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
                {!loading && filtered.length === 0 ? <PanelNotice tone="neutral">No encontramos usuarios para ese filtro.</PanelNotice> : null}

                {!loading && filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((user) => (
                            <article
                                key={user.id}
                                className="rounded-xl border px-4 py-4 transition-colors"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div
                                            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                        >
                                            {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.name}</p>
                                                <span
                                                    className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium"
                                                    style={{
                                                        background:
                                                            user.role === 'superadmin'
                                                                ? 'rgba(244, 63, 94, 0.12)'
                                                                : user.role === 'admin'
                                                                    ? 'rgba(59, 130, 246, 0.12)'
                                                                    : 'var(--bg-muted)',
                                                        color:
                                                            user.role === 'superadmin'
                                                                ? 'rgb(244, 63, 94)'
                                                                : user.role === 'admin'
                                                                    ? 'rgb(59, 130, 246)'
                                                                    : 'var(--fg-secondary)',
                                                    }}
                                                >
                                                    {user.role}
                                                </span>
                                                <span
                                                    className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium"
                                                    style={{
                                                        background:
                                                            user.status === 'verified'
                                                                ? 'rgba(34, 197, 94, 0.12)'
                                                                : user.status === 'active'
                                                                    ? 'rgba(59, 130, 246, 0.12)'
                                                                    : 'rgba(244, 63, 94, 0.12)',
                                                        color:
                                                            user.status === 'verified'
                                                                ? 'rgb(34, 197, 94)'
                                                                : user.status === 'active'
                                                                    ? 'rgb(59, 130, 246)'
                                                                    : 'rgb(244, 63, 94)',
                                                    }}
                                                >
                                                    {user.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm break-all" style={{ color: 'var(--fg-secondary)' }}>{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center lg:gap-6">
                                        <MetaItem label="Publicaciones" value={String(user.totalListings)} />
                                        <MetaItem label="Autos" value={String(user.autosListings)} />
                                        <MetaItem label="Propiedades" value={String(user.propiedadesListings)} />
                                        <MetaItem label="Registro" value={new Date(user.createdAt).toLocaleDateString('es-CL')} />
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <PanelButton variant="secondary" size="sm" className="h-9 px-3 text-sm" onClick={() => handleOpenAction('role', user)}>
                                            <IconShield size={14} stroke={1.9} />
                                            Rol
                                        </PanelButton>
                                        <PanelButton variant="secondary" size="sm" className="h-9 px-3 text-sm" onClick={() => handleOpenAction('delete', user)}>
                                            <IconTrash size={14} stroke={1.9} />
                                            Eliminar
                                        </PanelButton>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </PanelCard>

            {actionMode === 'role' && selectedUser ? (
                <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-5">
                    <button
                        type="button"
                        aria-label="Cerrar modal"
                        onClick={handleCloseAction}
                        className="absolute inset-0"
                        style={{ background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(8px)' }}
                    />
                    <div
                        className="relative z-[1] w-full max-w-md rounded-[28px] border p-6"
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
                <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-5">
                    <button
                        type="button"
                        aria-label="Cerrar modal"
                        onClick={handleCloseAction}
                        className="absolute inset-0"
                        style={{ background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(8px)' }}
                    />
                    <div
                        className="relative z-[1] w-full max-w-md rounded-[28px] border p-6"
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
        </div>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-[90px]">
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
