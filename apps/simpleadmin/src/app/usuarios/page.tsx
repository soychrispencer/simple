'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconSearch, IconTrash, IconEdit, IconShield, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, type AdminUserListItem } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function UsuariosPage() {
    return (
        <AdminProtectedPage>
            {() => <UsuariosContent />}
        </AdminProtectedPage>
    );
}

type ActionMode = 'edit' | 'role' | 'delete' | 'suspend' | null;

function UsuariosContent() {
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [roleValue, setRoleValue] = useState('');

    useEffect(() => {
        let active = true;
        const run = async () => {
            const next = await fetchAdminUsers();
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
        return items.filter((item) =>
            item.name.toLowerCase().includes(normalized) ||
            item.email.toLowerCase().includes(normalized)
        );
    }, [items, query]);

    const handleOpenAction = (mode: ActionMode, user: AdminUserListItem) => {
        setSelectedUser(user);
        setActionMode(mode);
        setMessage(null);
        if (mode === 'role') {
            setRoleValue(user.role);
        }
    };

    const handleCloseAction = () => {
        setActionMode(null);
        setSelectedUser(null);
        setRoleValue('');
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

            // Actualizar en la lista local
            const updated = items.map(u => u.id === selectedUser.id ? { ...u, role: roleValue as AdminUserListItem['role'] } : u);
            setItems(updated);
            setMessage({ type: 'success', text: `Rol actualizado a ${roleValue}` });
            
            setTimeout(handleCloseAction, 1500);
        } catch (error) {
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

            // Eliminar de la lista local
            setItems(items.filter(u => u.id !== selectedUser.id));
            setMessage({ type: 'success', text: 'Usuario eliminado' });
            
            setTimeout(handleCloseAction, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Usuarios</h1>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{items.length.toLocaleString('es-CL')} usuarios registrados</p>
                </div>
                <div className="relative">
                    <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario..." className="form-input pl-9 w-64 h-9 text-xs" />
                </div>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-[1.2fr_100px_100px_90px_100px_120px] gap-3 px-4 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                    <span>Usuario</span>
                    <span>Rol</span>
                    <span>Publicaciones</span>
                    <span>Registro</span>
                    <span>Estado</span>
                    <span>Acciones</span>
                </div>
                {loading ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando usuarios...</div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>No encontramos usuarios para ese filtro.</div>
                ) : (
                    filtered.map((user, index) => (
                        <div key={user.id} className="grid grid-cols-[1.2fr_100px_100px_90px_100px_120px] gap-3 px-4 py-3 items-center" style={{ background: 'var(--surface)', borderTop: index ? '1px solid var(--border)' : 'none' }}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                    {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{user.name}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium px-2 py-1 rounded w-fit" style={{ background: user.role === 'superadmin' ? 'rgba(244, 63, 94, 0.1)' : user.role === 'admin' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-muted)', color: user.role === 'superadmin' ? 'rgb(244, 63, 94)' : user.role === 'admin' ? 'rgb(59, 130, 246)' : 'var(--fg-secondary)' }}>
                                {user.role}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{user.totalListings}</span>
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{new Date(user.createdAt).toLocaleDateString('es-CL')}</span>
                            <span className="text-xs px-2 py-1 rounded w-fit" style={{ background: user.status === 'verified' ? 'rgba(34, 197, 94, 0.1)' : user.status === 'active' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: user.status === 'verified' ? 'rgb(34, 197, 94)' : user.status === 'active' ? 'rgb(59, 130, 246)' : 'rgb(244, 63, 94)' }}>
                                {user.status}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleOpenAction('role', user)}
                                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-opacity-80 transition-colors"
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}
                                    title="Cambiar rol"
                                >
                                    <IconShield size={14} stroke={2} />
                                </button>
                                <button
                                    onClick={() => handleOpenAction('delete', user) }
                                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-opacity-80 transition-colors"
                                    style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'rgb(244, 63, 94)' }}
                                    title="Eliminar usuario"
                                >
                                    <IconTrash size={14} stroke={2} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de cambio de rol */}
            {actionMode === 'role' && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseAction}>
                    <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>Cambiar rol: {selectedUser.name}</h2>
                        
                        <div className="mb-4">
                            <label className="block text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Nuevo rol</label>
                            <select
                                value={roleValue}
                                onChange={(e) => setRoleValue(e.target.value)}
                                className="w-full px-3 py-2 rounded border text-sm" 
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                            >
                                <option value="user">Usuario</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>

                        {message && (
                            <div className={`px-3 py-2 rounded text-sm mb-4 flex items-center gap-2 ${message.type === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                {message.type === 'error' ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
                                {message.text}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleCloseAction}
                                className="flex-1 px-4 py-2 rounded text-sm transition-colors"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                disabled={isProcessing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleChangeRole}
                                className="flex-1 px-4 py-2 rounded text-sm font-medium text-white transition-colors"
                                style={{ background: 'rgb(59, 130, 246)' }}
                                disabled={isProcessing || roleValue === selectedUser.role}
                            >
                                {isProcessing ? 'Actualizando...' : 'Actualizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            {actionMode === 'delete' && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseAction}>
                    <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.1)' }}>
                                <IconAlertCircle size={20} style={{ color: 'rgb(244, 63, 94)' }} />
                            </div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>¿Eliminar usuario?</h2>
                        </div>
                        
                        <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                            ¿Estás seguro de que deseas eliminar a <strong>{selectedUser.name}</strong> ({selectedUser.email})?
                        </p>

                        {message && (
                            <div className={`px-3 py-2 rounded text-sm mb-4 flex items-center gap-2 ${message.type === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                {message.type === 'error' ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
                                {message.text}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleCloseAction}
                                className="flex-1 px-4 py-2 rounded text-sm transition-colors"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                disabled={isProcessing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 px-4 py-2 rounded text-sm font-medium text-white transition-colors"
                                style={{ background: 'rgb(244, 63, 94)' }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
