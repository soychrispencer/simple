'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconCreditCard, IconClockHour4, IconLoader2, IconReceipt, IconShieldCheck } from '@tabler/icons-react';
import type {
    ConfirmCheckoutResponse,
    PaymentOrderStatus,
    PaymentOrderView,
    SubscriptionCatalogResponse,
    SubscriptionPlan,
    SubscriptionPlanId,
} from '@simple/utils';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from './panel-primitives';
import { SUBSCRIPTION_BILLING_HISTORY } from './finance-copy.js';
import { PanelButton } from './panel-button';
import { PanelCard } from './panel-card';

function formatMoney(value: number, currency: 'CLP' | 'USD' = 'CLP'): string {
    if (currency === 'USD') {
        return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return value.toLocaleString('es-CL');
}

function paymentProviderLabel(): string {
    return 'Mercado Pago';
}

function monthlyTotalWithVat(netMonthly: number): number {
    return Math.round(netMonthly * 1.19);
}

function trialMeta(catalog: SubscriptionCatalogResponse | null, currentPlanId: string) {
    if (currentPlanId !== 'free' || !catalog?.currentSubscription?.planExpiresAt) return null;
    const expiresAt = new Date(catalog.currentSubscription.planExpiresAt);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return { daysRemaining, isExpired: daysRemaining === 0, expiresAt };
}

function normalizeDisplayedPlanId(planId: string): string {
    return planId === 'essential' ? 'free' : planId;
}

function isPaidSubscriptionPlan(plan: SubscriptionPlan): boolean {
    return plan.id === 'pro' || (plan.priceMonthly > 0 && plan.id !== 'free');
}

function subscriptionTone(status: PaymentOrderStatus): 'success' | 'warning' | 'neutral' | 'info' {
    if (status === 'approved' || status === 'authorized') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'cancelled') return 'neutral';
    return 'info';
}

function subscriptionLabel(status: PaymentOrderStatus): string {
    if (status === 'approved') return 'Aprobado';
    if (status === 'authorized') return 'Activo';
    if (status === 'pending') return 'Pendiente';
    if (status === 'cancelled') return 'Cancelado';
    return 'Rechazado';
}

export type SubscriptionManagerPayments = {
    fetchSubscriptionCatalog: () => Promise<SubscriptionCatalogResponse | null>;
    confirmCheckout: (input: {
        orderId: string;
        paymentId?: string | null;
    }) => Promise<ConfirmCheckoutResponse>;
    startSubscriptionCheckout: (input: {
        planId: SubscriptionPlanId;
        returnUrl: string;
    }) => Promise<{ ok: boolean; checkoutUrl?: string | null; error?: string }>;
};

export type SubscriptionManagerProps = SubscriptionManagerPayments & {
    subscriptionsPath?: string;
};

export function SubscriptionManager({
    fetchSubscriptionCatalog,
    confirmCheckout,
    startSubscriptionCheckout,
    subscriptionsPath = '/panel/mi-cuenta/suscripcion',
}: SubscriptionManagerProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [orders, setOrders] = useState<PaymentOrderView[]>([]);
    const [checkoutEnabled, setCheckoutEnabled] = useState(false);
    const paymentProvider = 'mercadopago' as const;
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<SubscriptionCatalogResponse | null>(null);

    const load = async () => {
        setLoading(true);
        const catalogData = await fetchSubscriptionCatalog();
        if (!catalogData) {
            setError('No pudimos cargar tus suscripciones.');
            setLoading(false);
            return;
        }

        setCatalog(catalogData);
        setPlans(catalogData.plans.filter(isPaidSubscriptionPlan));
        setOrders(catalogData.orders);
        setCheckoutEnabled(Boolean(catalogData.checkoutEnabled));
        const rawPlanId = catalogData.currentSubscription?.planId ?? catalogData.freePlan?.id ?? 'free';
        const normalizedPlanId = normalizeDisplayedPlanId(rawPlanId);
        setCurrentPlanId(normalizedPlanId);
        setCurrentPlanName(
            normalizedPlanId === rawPlanId
                ? (catalogData.currentSubscription?.planName ?? catalogData.freePlan?.name ?? 'Gratuito')
                : (catalogData.freePlan?.name ?? 'Prueba gratuita'),
        );
        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        const purchaseId = searchParams.get('purchaseId');
        if (!purchaseId || handledPurchaseId === purchaseId) return;

        setHandledPurchaseId(purchaseId);
        setError('');

        void (async () => {
            const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id');
            const payload: { orderId: string; paymentId?: string } = {
                orderId: purchaseId,
            };
            if (paymentId) {
                payload.paymentId = paymentId;
            }
            const result = await confirmCheckout(payload);

            if (!result.ok) {
                setError(result.error ?? 'No pudimos confirmar la suscripción.');
                return;
            }

            if (result.status === 'authorized' || result.status === 'approved') {
                setMessage('Suscripción activada correctamente.');
            } else if (result.status === 'pending') {
                setMessage(`Tu suscripción quedó pendiente de validación en ${paymentProviderLabel()}.`);
            } else if (result.status === 'cancelled') {
                setError('La suscripción fue cancelada.');
            } else {
                setError('La suscripción no pudo ser aprobada.');
            }

            await load();
        })();
    }, [handledPurchaseId, paymentProvider, searchParams]);

    const paidPlans = useMemo(
        () => plans.filter((plan) => plan.id === 'pro'),
        [plans],
    );

    const trial = useMemo(() => trialMeta(catalog, currentPlanId), [catalog, currentPlanId]);
    const proPlan = paidPlans[0] ?? null;

    const startCheckout = async (planId: Exclude<SubscriptionPlanId, 'free'>) => {
        setBusyPlanId(planId);
        setError('');
        setMessage('');

        const result = await startSubscriptionCheckout({
            planId,
            returnUrl: `${window.location.origin}${subscriptionsPath}`,
        });

        if (!result.ok || !result.checkoutUrl) {
            setError(result.error ?? 'No pudimos iniciar la suscripción.');
            setBusyPlanId(null);
            return;
        }

        window.location.assign(result.checkoutUrl);
    };

    return (
        <div className="space-y-6">
            {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {!checkoutEnabled && !loading ? (
                <PanelNotice tone="warning">
                    Mercado Pago aún no está disponible en este entorno.
                </PanelNotice>
            ) : null}

            {!loading && trial ? (
                <div
                    className={`rounded-2xl border p-5 ${trial.isExpired ? 'border-red-500/40 bg-red-500/10' : 'border-(--accent-border) bg-(--accent-subtle)'}`}
                >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <PanelStatusBadge
                            label={trial.isExpired ? 'Prueba expirada' : 'Prueba gratuita activa'}
                            tone={trial.isExpired ? 'warning' : 'info'}
                        />
                        {!trial.isExpired ? (
                            <span className="rounded-full border border-(--border) bg-(--surface) px-2.5 py-0.5 text-xs font-semibold text-(--fg-secondary)">
                                {trial.daysRemaining} {trial.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                            </span>
                        ) : null}
                    </div>
                    <h3 className="text-lg font-semibold text-(--fg)">
                        {trial.isExpired ? 'Activa Pro para seguir usando el panel' : 'Tienes acceso completo durante tu prueba'}
                    </h3>
                    <p className="mt-1 text-sm text-(--fg-secondary)">
                        {trial.isExpired
                            ? 'Tu configuración se mantiene guardada. Solo falta activar Pro para volver a operar.'
                            : 'Puedes activar Pro ahora o esperar al fin de la prueba. Sin permanencia.'}
                    </p>
                </div>
            ) : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title={currentPlanId === 'pro' ? 'Tu plan Pro' : 'Continuar con Pro'}
                    description={
                        currentPlanId === 'pro'
                            ? `Suscripción mensual activa. El cobro se gestiona con ${paymentProviderLabel()}.`
                            : 'Un solo plan con todo incluido. Facturación mensual y cancelación cuando quieras.'
                    }
                />

                {loading ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="h-80 rounded-card animate-pulse bg-(--bg-muted)" />
                        <div className="h-80 rounded-card animate-pulse bg-(--bg-muted)" />
                    </div>
                ) : proPlan ? (
                    <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
                        <article
                            className={`flex h-full flex-col rounded-card border p-5 sm:p-6 ${
                                currentPlanId === 'pro' ? 'border-(--accent-border) bg-(--accent-subtle)' : 'border-(--border) bg-(--surface)'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">Plan mensual</p>
                                    <h3 className="mt-1 text-2xl font-semibold text-(--fg)">{proPlan.name}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-(--fg-secondary)">{proPlan.description}</p>
                                </div>
                                {currentPlanId === 'pro' ? (
                                    <PanelStatusBadge label="Activo" tone="success" />
                                ) : (
                                    <PanelStatusBadge label="Recomendado" tone="info" size="sm" />
                                )}
                            </div>

                            <div className="mt-6 rounded-xl border border-(--border) bg-(--bg-subtle) p-4">
                                <p className="text-3xl font-bold tracking-tight text-(--fg)">
                                    {proPlan.currency === 'USD' ? 'US$' : '$'}
                                    {formatMoney(proPlan.priceMonthly, proPlan.currency)}
                                    <span className="ml-1 text-base font-medium text-(--fg-muted)">
                                        {proPlan.currency === 'USD' ? '/ mes' : '+ IVA / mes'}
                                    </span>
                                </p>
                                {proPlan.currency === 'CLP' ? (
                                    <p className="mt-1 text-sm text-(--fg-secondary)">
                                        Total estimado: ${formatMoney(monthlyTotalWithVat(proPlan.priceMonthly), 'CLP')} / mes
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-(--fg-secondary)">
                                        Cobro en CLP vía Mercado Pago (tarjetas chilenas e internacionales según tu medio de pago).
                                    </p>
                                )}
                            </div>

                            <div className="mt-5 grid flex-1 gap-2 sm:grid-cols-2">
                                {proPlan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-2 text-sm">
                                        <IconCheck size={14} className="mt-0.5 shrink-0 text-(--accent)" />
                                        <span className="text-(--fg-secondary)">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-2">
                                <PanelButton
                                    className="w-full"
                                    variant={currentPlanId === 'pro' ? 'secondary' : 'primary'}
                                    disabled={
                                        currentPlanId === 'pro'
                                        || busyPlanId === proPlan.id
                                        || !checkoutEnabled
                                    }
                                    onClick={() => void startCheckout('pro')}
                                >
                                    {busyPlanId === proPlan.id ? (
                                        <IconLoader2 size={14} className="animate-spin" />
                                    ) : (
                                        <IconCreditCard size={14} />
                                    )}
                                    {currentPlanId === 'pro'
                                        ? 'Plan Pro activo'
                                        : `Activar Pro con ${paymentProviderLabel()}`}
                                </PanelButton>
                            </div>
                        </article>

                        <aside className="flex h-full flex-col gap-4 rounded-card border border-(--border) bg-(--bg-subtle) p-5 sm:p-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">Resumen</p>
                                <h4 className="mt-1 text-lg font-semibold text-(--fg)">
                                    {currentPlanId === 'pro' ? 'Tu suscripción' : 'Antes de activar'}
                                </h4>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-(--accent)">
                                        <IconClockHour4 size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">Prueba de 30 días</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            {trial?.isExpired
                                                ? 'Tu prueba terminó. Pro reactiva el acceso completo.'
                                                : trial
                                                    ? `Te quedan ${trial.daysRemaining} días con todo incluido.`
                                                    : 'Al registrarte tuviste acceso completo para configurar tu cuenta.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-(--accent)">
                                        <IconShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">Sin permanencia</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            Cancela cuando quieras desde {paymentProviderLabel()}. Tus datos permanecen en tu cuenta.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-(--accent)">
                                        <IconReceipt size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">Cobro transparente</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            Neto ${formatMoney(proPlan.priceMonthly)} + IVA 19% (${formatMoney(monthlyTotalWithVat(proPlan.priceMonthly) - proPlan.priceMonthly)}).
                                            El checkout de Mercado Pago muestra el monto final.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto rounded-xl border border-dashed border-(--border) p-4 text-xs leading-relaxed text-(--fg-muted)">
                                {currentPlanId === 'pro' ? (
                                    <>
                                        Estás en <strong className="text-(--fg)">{currentPlanName}</strong>.
                                        {' '}La facturación mensual aparece abajo en el historial.
                                    </>
                                ) : (
                                    <>
                                        Hoy estás en <strong className="text-(--fg)">{currentPlanName}</strong>.
                                        {' '}Al activar Pro mantienes tu configuración y sigues operando sin límites.
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                ) : (
                    <PanelNotice tone="neutral">No hay planes de pago disponibles en este momento.</PanelNotice>
                )}
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title={SUBSCRIPTION_BILLING_HISTORY.title}
                    description={SUBSCRIPTION_BILLING_HISTORY.description}
                />

                {loading ? (
                    <div className="h-20 rounded-card animate-pulse bg-(--bg-muted)" />
                ) : orders.length === 0 ? (
                    <PanelNotice tone="neutral">Aún no tienes órdenes de suscripción.</PanelNotice>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-4"
                            >
                                <div>
                                    <p className="font-medium text-(--fg)">{order.title}</p>
                                    <p className="mt-1 text-xs text-(--fg-secondary)">
                                        ${formatMoney(order.amount)} + IVA · {new Date(order.createdAt).toLocaleString('es-CL')}
                                    </p>
                                </div>
                                <PanelStatusBadge label={subscriptionLabel(order.status)} tone={subscriptionTone(order.status)} />
                            </article>
                        ))}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
