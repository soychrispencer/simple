'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminUsers, type AdminUserListItem } from '@/lib/api';

export default function UsuariosPage() {
    return (
        <AdminProtectedPage>
            {() => <UsuariosContent />}
        </AdminProtectedPage>
    );
}

function UsuariosContent() {
    const [items, setItems] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

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
                <div className="grid grid-cols-[1.4fr_120px_120px_100px_100px] gap-4 px-4 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                    <span>Usuario</span>
                    <span>Rol</span>
                    <span>Publicaciones</span>
                    <span>Registro</span>
                    <span>Estado</span>
                </div>
                {loading ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando usuarios...</div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-6 text-sm" style={{ color: 'var(--fg-muted)' }}>No encontramos usuarios para ese filtro.</div>
                ) : (
                    filtered.map((user, index) => (
                        <div key={user.id} className="grid grid-cols-[1.4fr_120px_120px_100px_100px] gap-4 px-4 py-3 items-center" style={{ background: 'var(--surface)', borderTop: index ? '1px solid var(--border)' : 'none' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                    {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.name}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                                </div>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{user.role}</span>
                            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{user.totalListings}</span>
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{new Date(user.createdAt).toLocaleDateString('es-CL')}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded w-fit" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>{user.status}</span>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
