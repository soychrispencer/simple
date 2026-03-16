'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconCar, IconFlag, IconHome, IconUsers } from '@tabler/icons-react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminOverview, type AdminOverview } from '@/lib/api';

export default function AdminDashboardPage() {
    return (
        <AdminProtectedPage>
            {() => <DashboardContent />}
        </AdminProtectedPage>
    );
}

function DashboardContent() {
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const run = async () => {
            const data = await fetchAdminOverview();
            if (!active) return;
            setOverview(data);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <p style={{ color: 'var(--fg-muted)' }}>Cargando resumen...</p>;
    }

    if (!overview) {
        return <p style={{ color: 'var(--fg-muted)' }}>No pudimos cargar el dashboard.</p>;
    }

    const cards = [
        { label: 'Usuarios totales', value: overview.stats.usersTotal, icon: <IconUsers size={16} /> },
        { label: 'Publicaciones autos', value: overview.stats.autosListingsTotal, icon: <IconCar size={16} /> },
        { label: 'Publicaciones propiedades', value: overview.stats.propiedadesListingsTotal, icon: <IconHome size={16} /> },
        { label: 'Leads nuevos', value: overview.stats.newServiceLeads, icon: <IconFlag size={16} /> },
    ];

    return (
        <>
            <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--fg)' }}>Dashboard</h1>
            <p className="text-xs mb-6" style={{ color: 'var(--fg-muted)' }}>Resumen real del ecosistema Simple</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {cards.map((item) => (
                    <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                        <div className="mb-2" style={{ color: 'var(--fg-muted)' }}>{item.icon}</div>
                        <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{item.value.toLocaleString('es-CL')}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Usuarios recientes</h2>
                        <Link href="/usuarios" className="text-xs" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>
                    {overview.recentUsers.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Todavía no hay usuarios registrados.</p>
                    ) : (
                        overview.recentUsers.map((user, index) => (
                            <div key={user.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: index ? '1px solid var(--border)' : 'none' }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                    {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {new Date(user.createdAt).toLocaleDateString('es-CL')}
                                </span>
                            </div>
                        ))
                    )}
                </section>

                <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Leads recientes</h2>
                        <Link href="/reportes" className="text-xs" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>
                    {overview.recentLeads.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Todavía no hay leads de servicios.</p>
                    ) : (
                        overview.recentLeads.map((lead, index) => (
                            <div key={lead.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: index ? '1px solid var(--border)' : 'none' }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {lead.serviceLabel} · {lead.vertical}
                                    </p>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{lead.createdAgo}</span>
                            </div>
                        ))
                    )}
                </section>
            </div>

            <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Publicaciones recientes</h2>
                    <Link href="/publicaciones" className="text-xs" style={{ color: 'var(--fg-muted)' }}>Ver todas</Link>
                </div>
                {overview.recentListings.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Todavía no hay publicaciones creadas.</p>
                ) : (
                    overview.recentListings.map((listing, index) => (
                        <div key={listing.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: index ? '1px solid var(--border)' : 'none' }}>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{listing.title}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {listing.ownerName} · {listing.vertical} · {listing.status}
                                </p>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {new Date(listing.updatedAt).toLocaleDateString('es-CL')}
                            </span>
                        </div>
                    ))
                )}
            </section>
        </>
    );
}
