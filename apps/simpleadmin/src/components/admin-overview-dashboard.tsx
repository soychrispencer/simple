'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { IconClock, IconCreditCard, IconRefresh, IconUserCheck, IconUsers } from '@tabler/icons-react';
import {
    PanelButton,
    PanelCard,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import { fetchAdminOverview, type AdminOverviewResponse } from '@/lib/api';
import { activitySummary, primaryPlanBadge } from './users/user-domain';

export function AdminOverviewDashboard() {
    const [data, setData] = useState<AdminOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await fetchAdminOverview());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar el resumen.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="Resumen del ecosistema"
                description="Vista ejecutiva de cuentas, suscripciones activas y vencimientos próximos."
                actions={<PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>}
            />

            {error ? <PanelNotice tone="error" className="mb-5">{error}</PanelNotice> : null}

            {loading ? (
                <SkeletonList count={4} />
            ) : data ? (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <PanelStatCard
                            label="Usuarios totales"
                            value={String(data.stats.usersTotal)}
                            meta={`${data.stats.usersRealActive} cuentas reales activas`}
                            icon={<IconUsers size={17} />}
                        />
                        <PanelStatCard
                            label="Suscripciones activas"
                            value={String(data.stats.withActiveSubscription)}
                            meta="En todo el ecosistema"
                            icon={<IconCreditCard size={17} />}
                        />
                        <PanelStatCard
                            label="SimpleAgenda"
                            value={String(data.stats.agendaProfilesTotal)}
                            meta={`${data.stats.agendaPaidTotal} pagos · ${data.stats.agendaTrialTotal} en prueba`}
                            icon={<IconUserCheck size={17} />}
                        />
                        <PanelStatCard
                            label="Publicaciones"
                            value={String(data.stats.autosListingsTotal + data.stats.propiedadesListingsTotal)}
                            meta={`${data.stats.autosListingsTotal} autos · ${data.stats.propiedadesListingsTotal} propiedades`}
                            icon={<IconClock size={17} />}
                        />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <PanelCard size="lg" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-[var(--fg)]">Próximos vencimientos (14 días)</h2>
                                <Link href="/planes" className="text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]">
                                    Ver planes →
                                </Link>
                            </div>
                            {data.expiringSoon.length === 0 ? (
                                <p className="text-sm text-[var(--fg-muted)]">No hay planes o pruebas por vencer en los próximos 14 días.</p>
                            ) : (
                                <ul className="divide-y divide-[var(--border)]">
                                    {data.expiringSoon.map((item) => (
                                        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-[var(--fg)]">{item.name}</p>
                                                <p className="truncate text-xs text-[var(--fg-muted)]">
                                                    {item.email} · vence {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('es-CL') : 'pronto'}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/?q=${encodeURIComponent(item.email)}&user=${encodeURIComponent(item.id)}`}
                                                className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--bg-subtle)]"
                                            >
                                                Abrir ficha
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </PanelCard>

                        <PanelCard size="lg" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-[var(--fg)]">Registros recientes</h2>
                                <Link href="/" className="text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]">
                                    Ver todos →
                                </Link>
                            </div>
                            <ul className="divide-y divide-[var(--border)]">
                                {data.recentUsers.map((user) => {
                                    const badge = primaryPlanBadge(user);
                                    return (
                                        <li key={user.id} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-medium text-[var(--fg)]">{user.name}</p>
                                                    <PanelStatusBadge label={badge.label} tone={badge.tone} size="sm" />
                                                </div>
                                                <p className="truncate text-xs text-[var(--fg-muted)]">
                                                    {user.email} · {activitySummary(user)}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/?q=${encodeURIComponent(user.email)}&user=${encodeURIComponent(user.id)}`}
                                                className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--bg-subtle)]"
                                            >
                                                Abrir ficha
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </PanelCard>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
