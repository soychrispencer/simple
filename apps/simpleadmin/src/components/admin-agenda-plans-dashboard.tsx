'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconCreditCard, IconExternalLink, IconRefresh, IconSearch, IconUsers } from '@tabler/icons-react';
import { AGENDA_PLAN_CATALOG, formatAgendaProMonthlyPrice, formatAgendaTeamsMonthlyPrice } from '@simple/utils';
import { ModernSelect } from '@simple/ui';
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
    if (plan.id === 'enterprise') return formatAgendaTeamsMonthlyPrice();
    if (plan.id === 'free') return 'Siempre gratis';
    return '';
}

function planNameLabel(item: AdminAgendaSubscription) {
    if (item.status === 'trial') return 'Prueba Pro';
    if (item.status === 'expired') return 'Gratis';
    if (item.plan === 'enterprise') return 'Negocios';
    if (item.plan === 'pro' || item.plan === 'pro_plus') return 'Pro';
    return 'Gratis';
}

function statusLabel(item: AdminAgendaSubscription) {
    if (item.status === 'active') return item.plan === 'enterprise' ? 'Negocios activo' : 'Pro activo';
    if (item.status === 'trial') return 'Prueba Pro';
    if (item.status === 'expired') return 'Gratis · Vencido';
    return 'Gratis';
}

function statusTone(status: AdminAgendaSubscription['status']): 'success' | 'info' | 'neutral' | 'warning' {
    if (status === 'active') return 'success';
    if (status === 'trial') return 'info';
    if (status === 'expired') return 'warning';
    return 'neutral';
}

const VISIBLE_CATALOG_PLANS = [
    AGENDA_PLAN_CATALOG.free,
    AGENDA_PLAN_CATALOG.pro,
    AGENDA_PLAN_CATALOG.business,
];

const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Pagados (Pro / Negocios)' },
    { value: 'trial', label: 'Prueba Pro' },
    { value: 'free', label: 'Gratis / vencidos' },
];

export function AdminAgendaPlansDashboard({ user }: { user: AdminSessionUser }) {
    const [subscriptions, setSubscriptions] = useState<AdminAgendaSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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
        pro: subscriptions.filter((item) => item.status === 'active' && item.plan !== 'enterprise').length,
        negocios: subscriptions.filter((item) => item.status === 'active' && item.plan === 'enterprise').length,
        trial: subscriptions.filter((item) => item.status === 'trial').length,
        free: subscriptions.filter((item) => item.status === 'free' || item.status === 'expired').length,
    }), [subscriptions]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return subscriptions.filter((item) => {
            if (statusFilter === 'active' && item.status !== 'active') return false;
            if (statusFilter === 'trial' && item.status !== 'trial') return false;
            if (statusFilter === 'free' && item.status !== 'free' && item.status !== 'expired') return false;
            if (!q) return true;
            return [item.displayName, item.userName, item.userEmail, item.slug]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(q);
        });
    }, [query, statusFilter, subscriptions]);

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
                description="Estructura vigente de 3 planes (Gratis, Pro y Negocios) y estado de cada perfil."
                actions={<PanelButton variant="secondary" onClick={() => void load()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>}
            />

            <PanelNotice tone="info" className="mb-5">
                Cada cuenta nueva recibe 30 días de prueba Pro sin tarjeta ni cobro automático. Al terminar, pasa a Gratis; Pro (\$14.990 + IVA, 50 WhatsApps/mes) y Negocios (\$34.990 + IVA, 3 profesionales y 120 WhatsApps/mes) se activan por suscripción o desde la ficha del usuario.
            </PanelNotice>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PanelStatCard label="Cuentas Agenda" value={String(summary.total)} meta="Perfiles registrados" icon={<IconUsers size={17} />} />
                <PanelStatCard label="Pruebas Pro" value={String(summary.trial)} meta="Acceso 30 días" icon={<IconCreditCard size={17} />} />
                <PanelStatCard label="Pro activos" value={String(summary.pro)} meta={formatAgendaProMonthlyPrice()} />
                <PanelStatCard label="Negocios activos" value={String(summary.negocios)} meta={formatAgendaTeamsMonthlyPrice()} />
            </div>

            {error ? <PanelNotice tone="error" className="mb-5">{error}</PanelNotice> : null}

            <div className="mb-8 grid gap-4 lg:grid-cols-3">
                {VISIBLE_CATALOG_PLANS.map((plan) => (
                    <PanelCard key={plan.id} className="flex flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--fg)]">{plan.name}</h2>
                                <p className="mt-1 text-sm font-medium text-[var(--fg-secondary)]">{planPriceLabel(plan)}</p>
                            </div>
                            <PanelStatusBadge label="Disponible" tone="success" />
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
                description="Filtra por cuenta o estado y abre directo la ficha para ajustar plan, fecha o créditos extra de WhatsApp."
            />

            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_240px]">
                <label className="relative">
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" size={17} />
                    <input
                        className="form-input pl-10"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar nombre, correo o slug"
                        aria-label="Buscar cuentas Agenda"
                    />
                </label>
                <ModernSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} ariaLabel="Filtrar por estado de plan" />
            </div>

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(220px,1.2fr)_130px_150px_130px_150px]">
                    <span>Cuenta</span>
                    <span>Plan</span>
                    <span>Estado</span>
                    <span>Perfil público</span>
                    <span />
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={5} /></PanelListRow>
                ) : filtered.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin perfiles que coincidan" description="Ajusta los filtros de búsqueda o estado." /></PanelListRow>
                ) : filtered.map((item) => (
                    <PanelListRow key={item.profileId} className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1.2fr)_130px_150px_130px_150px] md:items-center">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--fg)]">{item.displayName || item.userName}</p>
                            <p className="truncate text-xs text-[var(--fg-muted)]">{item.userEmail}</p>
                            {item.whatsappExtraCredits ? (
                                <p className="mt-0.5 text-[11px] font-medium text-[var(--fg-secondary)]">+{item.whatsappExtraCredits} WA extra</p>
                            ) : null}
                        </div>
                        <p className="text-sm text-[var(--fg-secondary)]">{planNameLabel(item)}</p>
                        <PanelStatusBadge label={statusLabel(item)} tone={statusTone(item.status)} />
                        <div className="text-xs text-[var(--fg-secondary)]">
                            {item.isPublished ? (
                                <a
                                    href={`https://simpleagenda.app/${item.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-[var(--fg)] hover:underline"
                                >
                                    Publicado <IconExternalLink size={12} />
                                </a>
                            ) : 'Privado'}
                        </div>
                        <Link
                            href={`/?vertical=agenda&q=${encodeURIComponent(item.userEmail)}&user=${encodeURIComponent(item.userId)}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium text-[var(--fg)] transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                            Abrir ficha
                        </Link>
                    </PanelListRow>
                ))}
            </PanelList>
        </div>
    );
}
