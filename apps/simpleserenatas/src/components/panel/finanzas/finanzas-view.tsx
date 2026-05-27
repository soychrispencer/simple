'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    IconCash,
    IconChartBar,
    IconCoin,
    IconReceipt,
} from '@tabler/icons-react';
import {
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelEmptyState,
    PanelNotice,
    PanelPillNav,
    PanelStatCard,
    PanelStatusBadge,
} from '@simple/ui/panel';
import {
    serenatasApi,
    type MusicianPayout,
    type SerenatasUser,
    type Serenata,
    type SerenataBillingOrder,
    type SerenataGroup,
    type SerenataMePlan,
} from '@/lib/serenatas-api';
import {
    buildFinanceMovements,
    buildOwnerFinanceSummary,
    currentMonthRange,
    type FinancePeriodRange,
} from '@/lib/owner-finance-summary';
import {
    finanzasTabFromSearch,
    finanzasTabLabel,
    type FinanzasTab,
    FINANZAS_TABS,
} from '@/lib/finanzas-tab';
import { panelSectionHref } from '@/lib/panel-routes';
import { formatDate, money, serenataStatusLabel, serenataStatusTone } from '../shared';
import { FinanzasPayoutModal } from './finanzas-payout-modal';

function periodPresets(): Array<{ key: string; label: string; range: FinancePeriodRange }> {
    const month = currentMonthRange();
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const last90 = new Date(now);
    last90.setDate(last90.getDate() - 90);
    return [
        { key: 'month', label: 'Este mes', range: month },
        {
            key: 'last-month',
            label: 'Mes anterior',
            range: {
                from: lastMonthStart.toISOString().slice(0, 10),
                to: lastMonthEnd.toISOString().slice(0, 10),
            },
        },
        {
            key: '90d',
            label: 'Últimos 90 días',
            range: { from: last90.toISOString().slice(0, 10), to: month.to },
        },
    ];
}

function isExampleBillingOrder(order: SerenataBillingOrder): boolean {
    const title = (order.title ?? '').toLowerCase();
    return (
        title.includes('demo')
        || title.includes('ejemplo')
        || title.includes('test')
    );
}

function billingTitle(order: SerenataBillingOrder): string {
    return (order.title ?? '').replace(/coordinador/gi, 'Pro');
}

export function FinanzasView({
    serenatas,
    groups,
    accountUser,
    refresh,
}: {
    serenatas: Serenata[];
    groups: SerenataGroup[];
    accountUser: SerenatasUser | null;
    refresh: () => Promise<void>;
}) {
    const router = useRouter();
    const pathname = usePathname() ?? '/panel/finanzas';
    const searchParams = useSearchParams();
    const tab = finanzasTabFromSearch(searchParams.toString());
    const [periodKey, setPeriodKey] = useState('month');
    const [ownerPlan, setOwnerPlan] = useState<SerenataMePlan | null>(null);
    const [payouts, setPayouts] = useState<MusicianPayout[]>([]);
    const [payoutFilter, setPayoutFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [billing, setBilling] = useState<SerenataBillingOrder[]>([]);
    const [loadingPayouts, setLoadingPayouts] = useState(false);
    const [loadingBilling, setLoadingBilling] = useState(false);
    const [payoutSerenata, setPayoutSerenata] = useState<Serenata | null>(null);
    const [payoutUpdatingId, setPayoutUpdatingId] = useState<string | null>(null);
    const canManageOwnerPayout = accountUser?.role === 'admin' || accountUser?.role === 'superadmin';

    const period = useMemo(
        () => periodPresets().find((entry) => entry.key === periodKey)?.range ?? currentMonthRange(),
        [periodKey],
    );

    const summary = useMemo(
        () => buildOwnerFinanceSummary(serenatas, ownerPlan, period, payouts),
        [serenatas, ownerPlan, period, payouts],
    );

    const movements = useMemo(
        () => buildFinanceMovements(serenatas, ownerPlan, period),
        [serenatas, ownerPlan, period],
    );

    const payoutTotals = useMemo(() => {
        const pending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
        const paid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
        return { pending, paid };
    }, [payouts]);

    const filteredPayouts = useMemo(() => {
        if (payoutFilter === 'all') return payouts;
        return payouts.filter((p) => p.status === payoutFilter);
    }, [payouts, payoutFilter]);

    const serenatasForPayout = useMemo(
        () => serenatas
            .filter((item) => item.groupId && ['scheduled', 'completed'].includes(item.status))
            .slice(0, 12),
        [serenatas],
    );

    const billingInRange = useMemo(() => billing.filter((item) => {
        if (isExampleBillingOrder(item)) return false;
        const raw = item.createdAt as unknown;
        let ymd = '';
        if (typeof raw === 'string') {
            ymd = raw.slice(0, 10);
        } else if (raw instanceof Date) {
            ymd = Number.isNaN(raw.getTime()) ? '' : raw.toISOString().slice(0, 10);
        } else {
            const parsed = new Date(raw as string | number);
            ymd = Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
        }
        if (!ymd) return false;
        return ymd >= period.from && ymd <= period.to;
    }), [billing, period]);

    const billingSubscriptions = useMemo(
        () => billingInRange.filter((item) => item.kind === 'subscription'),
        [billingInRange],
    );
    const billingBookings = useMemo(
        () => billingInRange.filter((item) => item.kind === 'serenata_booking'),
        [billingInRange],
    );

    useEffect(() => {
        void serenatasApi.mePlan().then((response) => {
            if (response.ok) setOwnerPlan(response);
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoadingPayouts(true);
        void serenatasApi.ownerMusicianPayouts().then((response) => {
            if (cancelled) return;
            setPayouts(response.ok ? response.items : []);
            setLoadingPayouts(false);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (tab !== 'cobros') return;
        let cancelled = false;
        setLoadingBilling(true);
        void serenatasApi.billingHistory().then((response) => {
            if (cancelled) return;
            setBilling(response.ok ? response.items : []);
            setLoadingBilling(false);
        });
        return () => { cancelled = true; };
    }, [tab]);

    function setTab(next: FinanzasTab) {
        const params = new URLSearchParams(searchParams.toString());
        if (next === 'resumen') params.delete('tab');
        else params.set('tab', next);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    function exportMovementsCsv() {
        const header = ['fecha', 'hora', 'destinatario', 'origen', 'estado', 'bruto_clp', 'comision_clp', 'neto_clp', 'cobro'];
        const rows = movements.map((row) => [
            row.eventDate,
            row.eventTime ?? '',
            row.recipientName,
            row.source,
            row.status,
            String(row.price ?? 0),
            String(row.commissionClp ?? 0),
            String(row.netClp ?? 0),
            row.collectionMethod ?? '',
        ]);
        const csv = [header, ...rows]
            .map((cols) => cols.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `finanzas-movimientos-${period.from}_a_${period.to}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function reloadPayouts() {
        const response = await serenatasApi.ownerMusicianPayouts();
        if (response.ok) setPayouts(response.items);
        await refresh();
    }

    async function markOwnerPayout(
        movement: (typeof movements)[number],
        status: 'pending' | 'paid',
    ) {
        if (movement.source !== 'platform_lead') return;
        setPayoutUpdatingId(movement.id);
        const reference = status === 'paid'
            ? window.prompt('Referencia de liquidación (opcional):', movement.ownerPayoutReference ?? '') ?? ''
            : '';
        const response = await serenatasApi.markOwnerPayout(movement.id, {
            status,
            amount: movement.netClp ?? movement.price ?? undefined,
            reference: reference.trim() || null,
        });
        setPayoutUpdatingId(null);
        if (!response.ok) return;
        await refresh();
    }

    const stats = [
        { label: 'Ingreso bruto', value: money(summary.grossClp), icon: <IconCoin size={16} /> },
        { label: 'Comisión app', value: money(summary.commissionClp), icon: <IconReceipt size={16} /> },
        { label: 'Neto estimado', value: money(summary.netEstimatedClp), icon: <IconChartBar size={16} /> },
        { label: 'Serenatas', value: String(summary.serenataCount), icon: <IconCash size={16} /> },
    ];

    return (
        <div className="space-y-6">
            <PanelPillNav
                items={FINANZAS_TABS.map((key) => ({ key, label: finanzasTabLabel(key) }))}
                activeKey={tab}
                onChange={(key) => setTab(key as FinanzasTab)}
                ariaLabel="Sección de finanzas"
            />

            <PanelPillNav
                items={periodPresets().map((entry) => ({ key: entry.key, label: entry.label }))}
                activeKey={periodKey}
                onChange={setPeriodKey}
                size="sm"
                ariaLabel="Período"
            />

            {tab === 'resumen' ? (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {stats.map((item) => (
                            <PanelStatCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
                        ))}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <PanelCard size="md">
                            <PanelBlockHeader title="Por origen" className="mb-3" />
                            <p className="text-sm text-fg-muted">
                                Propias: <span className="font-semibold text-fg">{summary.ownCount}</span>
                                {' · '}
                                Aplicación: <span className="font-semibold text-fg">{summary.platformCount}</span>
                            </p>
                        </PanelCard>
                        <PanelCard size="md">
                            <PanelBlockHeader title="Pagos a músicos" className="mb-3" />
                            <p className="text-sm text-fg-muted">
                                Pendiente: <span className="font-semibold text-fg">{money(payoutTotals.pending)}</span>
                                {' · '}
                                Pagado: <span className="font-semibold text-fg">{money(payoutTotals.paid)}</span>
                            </p>
                            <p className="mt-1 text-xs text-fg-muted">
                                Neto tras pagos realizados: <span className="font-semibold text-fg">{money(summary.netAfterMusiciansClp)}</span>
                            </p>
                            <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => setTab('musicos')}>
                                Ir a pagos músicos
                            </PanelButton>
                        </PanelCard>
                    </div>
                </>
            ) : null}

            {tab === 'movimientos' ? (
                <PanelCard size="md">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <PanelBlockHeader title="Movimientos" description="Serenatas del período con precio y cobro." />
                        <PanelButton size="sm" variant="secondary" onClick={exportMovementsCsv} disabled={movements.length === 0}>
                            Exportar CSV
                        </PanelButton>
                    </div>
                    {movements.length === 0 ? (
                        <PanelEmptyState title="Sin movimientos" description="No hay serenatas en este período." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border text-xs text-fg-muted">
                                        <th className="py-2 pr-3 font-medium">Fecha</th>
                                        <th className="py-2 pr-3 font-medium">Destinatario</th>
                                        <th className="py-2 pr-3 font-medium">Origen</th>
                                        <th className="py-2 pr-3 font-medium">Estado</th>
                                        {canManageOwnerPayout ? (
                                            <th className="py-2 pr-3 font-medium">Liquidación dueño</th>
                                        ) : null}
                                        <th className="py-2 pr-3 font-medium text-right">Bruto</th>
                                        <th className="py-2 pr-3 font-medium text-right">Neto</th>
                                        <th className="py-2 font-medium">Cobro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((row) => (
                                        <tr key={row.id} className="border-b border-border/60">
                                            <td className="py-2.5 pr-3 text-fg-muted">
                                                {formatDate(row.eventDate)}
                                                {row.eventTime ? ` ${row.eventTime}` : ''}
                                            </td>
                                            <td className="py-2.5 pr-3 font-medium text-fg">{row.recipientName}</td>
                                            <td className="py-2.5 pr-3 text-fg-muted">
                                                {row.source === 'own_lead' ? 'Propia' : 'App'}
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <PanelStatusBadge
                                                    size="sm"
                                                    tone={serenataStatusTone(row.status)}
                                                    label={serenataStatusLabel(row.status)}
                                                />
                                            </td>
                                            {canManageOwnerPayout ? (
                                                <td className="py-2.5 pr-3">
                                                    {row.source !== 'platform_lead' ? (
                                                        <span className="text-xs text-fg-muted">No aplica</span>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <PanelStatusBadge
                                                                size="sm"
                                                                tone={row.ownerPayoutStatus === 'paid' ? 'success' : 'warning'}
                                                                label={row.ownerPayoutStatus === 'paid' ? 'Liquidado' : 'Pendiente'}
                                                            />
                                                            <PanelButton
                                                                size="sm"
                                                                variant="secondary"
                                                                disabled={payoutUpdatingId === row.id}
                                                                onClick={() => void markOwnerPayout(
                                                                    row,
                                                                    row.ownerPayoutStatus === 'paid' ? 'pending' : 'paid',
                                                                )}
                                                            >
                                                                {row.ownerPayoutStatus === 'paid' ? 'Marcar pendiente' : 'Marcar liquidado'}
                                                            </PanelButton>
                                                        </div>
                                                    )}
                                                </td>
                                            ) : null}
                                            <td className="py-2.5 pr-3 text-right tabular-nums">{money(row.price)}</td>
                                            <td className="py-2.5 pr-3 text-right tabular-nums text-accent">{money(row.netClp)}</td>
                                            <td className="py-2.5 text-fg-muted">{row.collectionMethod ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </PanelCard>
            ) : null}

            {tab === 'musicos' ? (
                <div className="space-y-4">
                    <PanelCard size="md">
                        <PanelBlockHeader
                            title="Coordinar pagos"
                            description="Registra cuánto pagaste a cada músico por serenata."
                            className="mb-4"
                        />
                        {serenatasForPayout.length === 0 ? (
                            <PanelNotice tone="neutral">
                                No hay serenatas con grupo asignado para liquidar.
                            </PanelNotice>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {serenatasForPayout.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/40"
                                        onClick={() => setPayoutSerenata(item)}
                                    >
                                        <p className="font-semibold text-fg">{item.recipientName}</p>
                                        <p className="mt-1 text-xs text-fg-muted">
                                            {formatDate(item.eventDate)} · {money(item.price)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </PanelCard>

                    <PanelCard size="md">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <PanelBlockHeader title="Registro de pagos" />
                            <PanelPillNav
                                items={[
                                    { key: 'all', label: 'Todos' },
                                    { key: 'pending', label: 'Pendientes' },
                                    { key: 'paid', label: 'Pagados' },
                                ]}
                                activeKey={payoutFilter}
                                onChange={(key) => setPayoutFilter(key as typeof payoutFilter)}
                                size="sm"
                                showMobileDropdown={false}
                                ariaLabel="Filtrar pagos"
                            />
                        </div>
                        {loadingPayouts ? (
                            <p className="text-sm text-fg-muted">Cargando…</p>
                        ) : filteredPayouts.length === 0 ? (
                            <PanelEmptyState
                                title="Sin pagos registrados"
                                description="Abre una serenata arriba para repartir montos al grupo."
                            />
                        ) : (
                            <div className="space-y-2">
                                {filteredPayouts.map((payout) => (
                                    <div
                                        key={payout.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-fg">
                                                {payout.musicianName ?? 'Músico'}
                                                <span className="font-normal text-fg-muted">
                                                    {' · '}
                                                    {payout.recipientName}
                                                </span>
                                            </p>
                                            <p className="text-xs text-fg-muted">
                                                {payout.eventDate ? formatDate(payout.eventDate) : ''}
                                                {payout.paymentMethod ? ` · ${payout.paymentMethod}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold tabular-nums text-fg">{money(payout.amount)}</span>
                                            <PanelStatusBadge
                                                size="sm"
                                                tone={payout.status === 'paid' ? 'success' : 'warning'}
                                                label={payout.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PanelCard>
                </div>
            ) : null}

            {tab === 'cobros' ? (
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Cobros Simple"
                        description="Suscripción Pro y serenatas cobradas por la aplicación."
                        className="mb-4"
                    />
                    {loadingBilling ? (
                        <p className="text-sm text-fg-muted">Cargando…</p>
                    ) : billingInRange.length === 0 ? (
                        <PanelEmptyState title="Sin cobros" description="Aún no hay órdenes de pago en tu cuenta." />
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <h3 className="mb-2 text-sm font-semibold text-fg">Suscripción</h3>
                                {billingSubscriptions.length === 0 ? (
                                    <PanelNotice tone="neutral">No hay cobros de suscripción en este período.</PanelNotice>
                                ) : (
                                    <div className="space-y-2">
                                        {billingSubscriptions.map((order) => (
                                            <div
                                                key={order.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
                                            >
                                                <div>
                                                    <p className="font-medium text-fg">{billingTitle(order)}</p>
                                                    <p className="text-xs text-fg-muted">
                                                        {new Date(order.createdAt).toLocaleDateString('es-CL')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold tabular-nums">{money(order.amount)}</p>
                                                    <p className="text-xs capitalize text-fg-muted">{order.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="mb-2 text-sm font-semibold text-fg">Cobros de serenatas</h3>
                                {billingBookings.length === 0 ? (
                                    <PanelNotice tone="neutral">No hay cobros de serenatas en este período.</PanelNotice>
                                ) : (
                                    <div className="space-y-2">
                                        {billingBookings.map((order) => (
                                            <div
                                                key={order.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
                                            >
                                                <div>
                                                    <p className="font-medium text-fg">{billingTitle(order)}</p>
                                                    <p className="text-xs text-fg-muted">
                                                        {new Date(order.createdAt).toLocaleDateString('es-CL')}
                                                    </p>
                                                    {order.appliedResourceId ? (
                                                        <button
                                                            type="button"
                                                            className="mt-1 text-xs font-medium text-accent hover:underline"
                                                            onClick={() => {
                                                                router.push(`${panelSectionHref('solicitudes')}?serenata=${encodeURIComponent(order.appliedResourceId!)}`);
                                                            }}
                                                        >
                                                            Ver solicitud
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold tabular-nums">{money(order.amount)}</p>
                                                    <p className="text-xs capitalize text-fg-muted">{order.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </PanelCard>
            ) : null}

            {payoutSerenata ? (
                <FinanzasPayoutModal
                    serenata={payoutSerenata}
                    groups={groups}
                    open
                    onClose={() => setPayoutSerenata(null)}
                    onSaved={() => void reloadPayouts()}
                />
            ) : null}
        </div>
    );
}
