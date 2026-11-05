'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconCreditCard, IconRefresh, IconUsers } from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, formatAgendaProMonthlyPrice } from '@simple/utils';
import {
    PanelButton,
    PanelCard,
    PanelEmptyState,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import {
    fetchAdminAgendaSubscriptions,
    type AdminAgendaSubscription,
    type AdminSessionUser,
} from '@/lib/api';

function planPriceLabel(plan: (typeof AGENDA_PLAN_CATALOG)[keyof typeof AGENDA_PLAN_CATALOG]) {
    if (plan.id === 'pro') return formatAgendaProMonthlyPrice();
    if (plan.id === 'free') return 'Siempre gratis después de la prueba';
    return plan.availability === 'contact' ? 'A cotizar según el equipo' : 'Próximamente';
}

function statusLabel(status: AdminAgendaSubscription['status']) {
    if (status === 'active') return 'Pro activo';
    if (status === 'trial') return 'Prueba Pro';
    if (status === 'expired') return 'Gratis · Pro vencido';
    return 'Gratis';
}

function statusTone(status: AdminAgendaSubscription['status']): 'success' | 'info' | 'neutral' | 'warning' {
    if (status === 'active') return 'success';
    if (status === 'trial') return 'info';
    if (status === 'expired') return 'warning';
    return 'neutral';
}

export function AdminAgendaPlansDashboard({ user }: { user: AdminSessionUser }) {
    const [subscriptions, setSubscriptions] = useState<AdminAgendaSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setSubscriptions(await fetchAdminAgendaSubscriptions());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas de Agenda.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const summary = useMemo(() => ({
        total: subscriptions.length,
        pro: subscriptions.filter((item) => item.status === 'active').length,
        trial: subscriptions.filter((item) => item.status === 'trial').length,
        free: subscriptions.filter((item) => item.status === 'free' || item.status === 'expired').length,
    }), [subscriptions]);

    if (user.role !== 'superadmin') {
        return (
            <div className="container-app panel-page py-6">
                <PanelNotice tone="warning">La administración de planes está disponible solo para superadministradores.</PanelNotice>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="Planes de SimpleAgenda"
                description="Precios, límites y cuentas que puedes administrar desde SimpleAdmin."
                actions={<PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>}
            />

            <PanelNotice tone="info" className="mb-5">
                Cada cuenta nueva recibe 30 días de Pro sin tarjeta ni cobro automático. Al terminar, continúa en Gratis; Pro se activa solo cuando el usuario lo contrata o un superadmin lo asigna.
            </PanelNotice>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PanelStatCard label="Cuentas de Agenda" value={String(summary.total)} meta="Perfiles registrados" icon={<IconUsers size={17} />} />
                <PanelStatCard label="Pruebas Pro" value={String(summary.trial)} meta="Acceso completo por 30 días" icon={<IconCreditCard size={17} />} />
                <PanelStatCard label="Pro" value={String(summary.pro)} meta={formatAgendaProMonthlyPrice()} />
                <PanelStatCard label="Gratis" value={String(summary.free)} meta="Sin cobro automático" />
            </div>

            {error ? <PanelNotice tone="error" className="mb-5">{error}</PanelNotice> : null}

            <div className="mb-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {Object.values(AGENDA_PLAN_CATALOG).map((plan) => (
                    <PanelCard key={plan.id} className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--fg)]">{plan.name}</h2>
                                <p className="mt-1 text-sm font-medium text-[var(--fg-secondary)]">{planPriceLabel(plan)}</p>
                            </div>
                            <PanelStatusBadge
                                label={plan.availability === 'available' ? 'Disponible' : plan.availability === 'contact' ? 'A cotizar' : 'Próximamente'}
                                tone={plan.availability === 'available' ? 'success' : 'neutral'}
                            />
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-[var(--fg-muted)]">{plan.description}</p>
                        <ul className="mt-4 grid gap-2 text-xs leading-relaxed text-[var(--fg-secondary)]">
                            {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden="true">•</span><span>{feature}</span></li>)}
                        </ul>
                    </PanelCard>
                ))}
            </div>

            <PanelPageHeader
                title="Cuentas y planes actuales"
                description="Para asignar Gratis o Pro, abre la cuenta en Usuarios y entra a Suscripciones. Pro+ y Empresa no se asignan hasta habilitar sus funciones y cobros."
            />

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(220px,1.2fr)_minmax(140px,0.7fr)_140px_120px_140px]">
                    <span>Cuenta</span>
                    <span>Plan</span>
                    <span>Estado</span>
                    <span>Perfil público</span>
                    <span />
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={5} /></PanelListRow>
                ) : subscriptions.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin perfiles de Agenda" description="Las cuentas aparecerán aquí cuando creen un perfil de SimpleAgenda." /></PanelListRow>
                ) : subscriptions.map((item) => (
                    <PanelListRow key={item.profileId} className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1.2fr)_minmax(140px,0.7fr)_140px_120px_140px] md:items-center">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--fg)]">{item.displayName || item.userName}</p>
                            <p className="truncate text-xs text-[var(--fg-muted)]">{item.userEmail}</p>
                        </div>
                        <p className="text-sm text-[var(--fg-secondary)]">{item.status === 'trial' ? 'Prueba Pro' : item.status === 'expired' ? 'Gratis' : item.plan === 'pro' ? 'Pro' : 'Gratis'}</p>
                        <PanelStatusBadge label={statusLabel(item.status)} tone={statusTone(item.status)} />
                        <span className="text-xs text-[var(--fg-secondary)]">{item.isPublished ? 'Publicado' : 'Privado'}</span>
                        <Link
                            href={`/?vertical=agenda&q=${encodeURIComponent(item.userEmail)}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--fg)] transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                            Administrar cuenta
                        </Link>
                    </PanelListRow>
                ))}
            </PanelList>
        </div>
    );
}
