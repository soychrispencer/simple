'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminOverview, type AdminOverview } from '@/lib/api';
import { PanelCard, PanelList, PanelListRow, PanelNotice, PanelStatCard } from '@simple/ui';

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
        return (
            <div className="container-app panel-page py-8">
                <PanelNotice tone="neutral">Cargando resumen...</PanelNotice>
            </div>
        );
    }

    if (!overview) {
        return (
            <div className="container-app panel-page py-8">
                <PanelNotice tone="neutral">No pudimos cargar el dashboard.</PanelNotice>
            </div>
        );
    }

    const cards = [
        { label: 'Usuarios', value: overview.stats.usersTotal.toLocaleString('es-CL'), meta: 'Cuentas totales registradas' },
        { label: 'Autos', value: overview.stats.autosListingsTotal.toLocaleString('es-CL'), meta: 'Publicaciones en SimpleAutos' },
        { label: 'Propiedades', value: overview.stats.propiedadesListingsTotal.toLocaleString('es-CL'), meta: 'Publicaciones en SimplePropiedades' },
        { label: 'Leads', value: overview.stats.newServiceLeads.toLocaleString('es-CL'), meta: 'Leads recientes del ecosistema' },
    ];

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Dashboard</h1>
                <p className="type-page-subtitle mt-1">Resumen operativo de usuarios, publicaciones y leads en todo el ecosistema Simple.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {cards.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} meta={item.meta} />
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <PanelCard size="md">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Usuarios recientes</h2>
                            <p className="type-page-subtitle mt-1">Altas más recientes del sistema.</p>
                        </div>
                        <Link href="/usuarios" className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>

                    {overview.recentUsers.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay usuarios registrados.</PanelNotice>
                    ) : (
                        <PanelList className="border-0 rounded-[18px]">
                            {overview.recentUsers.map((user, index) => (
                                <PanelListRow key={user.id} divider={index > 0} className="flex items-center gap-3 px-4 py-3">
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                    >
                                        {user.name.split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {new Date(user.createdAt).toLocaleDateString('es-CL')}
                                    </span>
                                </PanelListRow>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>

                <PanelCard size="md">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Leads recientes</h2>
                            <p className="type-page-subtitle mt-1">Últimos contactos capturados por la plataforma.</p>
                        </div>
                        <Link href="/reportes" className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>

                    {overview.recentLeads.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay leads de servicios.</PanelNotice>
                    ) : (
                        <PanelList className="border-0 rounded-[18px]">
                            {overview.recentLeads.map((lead, index) => (
                                <PanelListRow key={lead.id} divider={index > 0} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{lead.contactName}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {lead.serviceLabel} · {lead.vertical}
                                        </p>
                                    </div>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{lead.createdAgo}</span>
                                </PanelListRow>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>
            </div>

            <PanelCard size="md">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Publicaciones recientes</h2>
                        <p className="type-page-subtitle mt-1">Actividad transversal entre autos y propiedades.</p>
                    </div>
                    <Link href="/publicaciones" className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todas</Link>
                </div>

                {overview.recentListings.length === 0 ? (
                    <PanelNotice tone="neutral">Todavía no hay publicaciones creadas.</PanelNotice>
                ) : (
                    <PanelList className="border-0 rounded-[18px]">
                        {overview.recentListings.map((listing, index) => (
                            <PanelListRow key={listing.id} divider={index > 0} className="flex items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{listing.title}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {listing.ownerName} · {listing.vertical} · {listing.status}
                                    </p>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {new Date(listing.updatedAt).toLocaleDateString('es-CL')}
                                </span>
                            </PanelListRow>
                        ))}
                    </PanelList>
                )}
            </PanelCard>
        </div>
    );
}
