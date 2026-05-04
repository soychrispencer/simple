'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { fetchAdminOverview, type AdminOverview } from '@/lib/api';
import { PanelCard, PanelList, PanelListRow, PanelNotice, PanelStatCard } from '@simple/ui';
import { adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';

export default function AdminDashboardPage() {
    return (
        <AdminProtectedPage>
            {() => <DashboardContent />}
        </AdminProtectedPage>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const scope = normalizeAdminScope(searchParams.get('scope'));

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

    const scopedUsers =
        scope === 'agenda'
            ? overview.recentUsers.filter((user) => user.agendaListings > 0)
            : scope === 'autos'
                ? overview.recentUsers.filter((user) => user.autosListings > 0)
                : scope === 'propiedades'
                    ? overview.recentUsers.filter((user) => user.propiedadesListings > 0)
                    : scope === 'serenatas'
                        ? overview.recentUsers.filter((user) => Boolean(user.subscriptions?.serenatas))
                    : overview.recentUsers;

    const scopedListings =
        scope === 'autos' || scope === 'propiedades'
            ? overview.recentListings.filter((listing) => listing.vertical === scope)
            : overview.recentListings;

    const scopedLeads =
        scope === 'autos' || scope === 'propiedades'
            ? overview.recentLeads.filter((lead) => lead.vertical === scope)
            : overview.recentLeads;

    const configCount = [
        overview.systemStatus.databaseConfigured,
        overview.systemStatus.smtpConfigured,
        overview.systemStatus.googleOAuthConfigured,
        overview.systemStatus.instagramConfigured,
        overview.systemStatus.mercadoPagoConfigured,
        overview.systemStatus.leadIngestConfigured,
        overview.systemStatus.sessionConfigured,
    ].filter(Boolean).length;

    const cards =
        scope === 'agenda'
            ? [
                  { label: 'Usuarios agenda', value: scopedUsers.length.toLocaleString('es-CL'), meta: 'Con publicaciones o actividad en agenda' },
                  { label: 'Publicaciones', value: (overview.stats.agendaListingsTotal ?? 0).toLocaleString('es-CL'), meta: 'Inventario de SimpleAgenda' },
                  { label: 'Leads recientes', value: scopedLeads.length.toLocaleString('es-CL'), meta: 'Últimos leads de la vertical' },
                  { label: 'Cobertura admin', value: overview.recentUsers.filter((user) => user.role !== 'user').length.toLocaleString('es-CL'), meta: 'Equipos con acceso administrativo' },
              ]
            : scope === 'autos'
                ? [
                      { label: 'Usuarios autos', value: scopedUsers.length.toLocaleString('es-CL'), meta: 'Con publicaciones o actividad en autos' },
                      { label: 'Publicaciones', value: overview.stats.autosListingsTotal.toLocaleString('es-CL'), meta: 'Inventario de SimpleAutos' },
                      { label: 'Leads recientes', value: scopedLeads.length.toLocaleString('es-CL'), meta: 'Últimos leads de la vertical' },
                      { label: 'Cobertura admin', value: overview.recentUsers.filter((user) => user.role !== 'user').length.toLocaleString('es-CL'), meta: 'Equipos con acceso administrativo' },
                  ]
                : scope === 'propiedades'
                    ? [
                          { label: 'Usuarios propiedades', value: scopedUsers.length.toLocaleString('es-CL'), meta: 'Con publicaciones o actividad en propiedades' },
                          { label: 'Publicaciones', value: overview.stats.propiedadesListingsTotal.toLocaleString('es-CL'), meta: 'Inventario de SimplePropiedades' },
                          { label: 'Leads recientes', value: scopedLeads.length.toLocaleString('es-CL'), meta: 'Últimos leads de la vertical' },
                          { label: 'Cobertura admin', value: overview.recentUsers.filter((user) => user.role !== 'user').length.toLocaleString('es-CL'), meta: 'Equipos con acceso administrativo' },
                    ]
                    : scope === 'serenatas'
                        ? [
                              { label: 'Usuarios serenatas', value: scopedUsers.length.toLocaleString('es-CL'), meta: 'Con perfil o suscripción activa en serenatas' },
                              { label: 'Músicos/verificables', value: scopedUsers.filter((u) => u.status === 'verified').length.toLocaleString('es-CL'), meta: 'Cuentas verificadas para operación' },
                              { label: 'Leads recientes', value: scopedLeads.length.toLocaleString('es-CL'), meta: 'Últimos leads de la vertical' },
                              { label: 'Cobertura admin', value: overview.recentUsers.filter((user) => user.role !== 'user').length.toLocaleString('es-CL'), meta: 'Equipos con acceso administrativo' },
                          ]
                    : [
                          { label: 'Usuarios', value: overview.stats.usersTotal.toLocaleString('es-CL'), meta: 'Cuentas totales registradas' },
                          { label: 'Agenda', value: (overview.stats.agendaListingsTotal ?? 0).toLocaleString('es-CL'), meta: 'Publicaciones en SimpleAgenda' },
                          { label: 'Autos', value: overview.stats.autosListingsTotal.toLocaleString('es-CL'), meta: 'Publicaciones en SimpleAutos' },
                          { label: 'Propiedades', value: overview.stats.propiedadesListingsTotal.toLocaleString('es-CL'), meta: 'Publicaciones en SimplePropiedades' },
                      ];

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Dashboard</h1>
                <p className="type-page-subtitle mt-1">Resumen operativo de {adminScopeLabel(scope).toLowerCase()} dentro del ecosistema Simple.</p>
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
                            <p className="type-page-subtitle mt-1">Altas y cuentas relevantes para {adminScopeLabel(scope).toLowerCase()}.</p>
                        </div>
                        <Link href={withAdminScope('/usuarios', scope)} className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>

                    {scopedUsers.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay usuarios registrados.</PanelNotice>
                    ) : (
                        <PanelList className="border-0 rounded-[18px]">
                            {scopedUsers.map((user, index) => (
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
                            <p className="type-page-subtitle mt-1">Últimos contactos capturados para este frente administrativo.</p>
                        </div>
                        <Link href={withAdminScope('/reportes', scope)} className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todos</Link>
                    </div>

                    {scopedLeads.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay leads de servicios.</PanelNotice>
                    ) : (
                        <PanelList className="border-0 rounded-[18px]">
                            {scopedLeads.map((lead, index) => (
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
                            <p className="type-page-subtitle mt-1">Actividad reciente de publicaciones para el contexto seleccionado.</p>
                        </div>
                    <Link href={withAdminScope('/publicaciones', scope)} className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ver todas</Link>
                </div>

                {scopedListings.length === 0 ? (
                    <PanelNotice tone="neutral">
                        {scope === 'agenda' ? 'Todavía no hay publicaciones en SimpleAgenda.' : 'Todavía no hay publicaciones creadas.'}
                    </PanelNotice>
                ) : (
                    <PanelList className="border-0 rounded-[18px]">
                        {scopedListings.map((listing, index) => (
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
