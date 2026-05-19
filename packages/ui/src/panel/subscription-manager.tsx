'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconCreditCard, IconLoader2 } from '@tabler/icons-react';
import type {
    ConfirmCheckoutResponse,
    PaymentOrderStatus,
    PaymentOrderView,
    SubscriptionCatalogResponse,
    SubscriptionPlan,
    SubscriptionPlanId,
} from '@simple/utils';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from './panel-primitives';
import { PanelButton } from './panel-button';
import { PanelCard } from './panel-card';

function formatMoney(value: number): string {
    return value.toLocaleString('es-CL');
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
    subscriptionsPath = '/panel/suscripciones',
}: SubscriptionManagerProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [freePlan, setFreePlan] = useState<SubscriptionPlan | null>(null);
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [orders, setOrders] = useState<PaymentOrderView[]>([]);
    const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        const catalog = await fetchSubscriptionCatalog();
        if (!catalog) {
            setError('No pudimos cargar tus suscripciones.');
            setLoading(false);
            return;
        }

        setPlans(catalog.plans);
        setFreePlan(catalog.freePlan);
        setOrders(catalog.orders);
        setMercadoPagoEnabled(catalog.mercadoPagoEnabled);
        setCurrentPlanId(catalog.currentSubscription?.planId ?? catalog.freePlan?.id ?? 'free');
        setCurrentPlanName(catalog.currentSubscription?.planName ?? catalog.freePlan?.name ?? 'Gratuito');
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
            const result = await confirmCheckout({
                orderId: purchaseId,
                paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id'),
            });

            if (!result.ok) {
                setError(result.error ?? 'No pudimos confirmar la suscripción.');
                return;
            }

            if (result.status === 'authorized' || result.status === 'approved') {
                setMessage('Suscripción activada correctamente.');
            } else if (result.status === 'pending') {
                setMessage('Tu suscripción quedó pendiente de validación en Mercado Pago.');
            } else if (result.status === 'cancelled') {
                setError('La suscripción fue cancelada.');
            } else {
                setError('La suscripción no pudo ser aprobada.');
            }

            await load();
        })();
    }, [handledPurchaseId, searchParams]);

    const currentPlan = useMemo(
        () => plans.find((plan) => plan.id === currentPlanId) ?? freePlan,
        [plans, freePlan, currentPlanId]
    );

    const startCheckout = async (planId: Extract<SubscriptionPlanId, 'pro' | 'enterprise'>) => {
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
            {!mercadoPagoEnabled && !loading ? (
                <PanelNotice tone="warning">Mercado Pago aún no está disponible en este entorno.</PanelNotice>
            ) : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Plan actual"
                    description="Gestiona tu suscripción mensual para publicar y vender mejor."
                />

                {loading ? (
                    <div className="h-24 rounded-card animate-pulse bg-(--bg-muted)" />
                ) : (
                    <div className="rounded-card border border-(--border) bg-(--bg-subtle) p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-(--fg-secondary)">Actualmente activo</p>
                                <h3 className="text-2xl font-semibold text-(--fg)">{currentPlanName}</h3>
                                <p className="mt-1 text-sm text-(--fg-secondary)">
                                    {currentPlan?.priceMonthly ? `$${formatMoney(currentPlan.priceMonthly)} / mes` : 'Sin costo mensual'}
                                </p>
                            </div>
                            <PanelStatusBadge
                                label={currentPlanId === 'free' ? 'Base' : 'Suscrito'}
                                tone={currentPlanId === 'free' ? 'neutral' : 'success'}
                            />
                        </div>
                        {currentPlan?.features?.length ? (
                            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                                {currentPlan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-2 text-sm">
                                        <IconCheck size={14} className="mt-0.5 shrink-0 text-(--fg-secondary)" />
                                        <span className="text-(--fg-secondary)">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                )}
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Planes disponibles"
                    description="Elige el plan que quieres facturar mensualmente con Mercado Pago."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const isPaid = plan.priceMonthly > 0 && plan.id !== 'free';
                        return (
                            <article
                                key={plan.id}
                                className={`rounded-card border p-5 ${isCurrent ? 'border-(--fg) bg-(--bg-subtle)' : 'border-(--border) bg-(--surface)'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-(--fg)">{plan.name}</p>
                                        <p className="mt-1 text-sm text-(--fg-secondary)">{plan.description}</p>
                                    </div>
                                    {plan.recommended ? <PanelStatusBadge label="Recomendado" tone="info" size="sm" /> : null}
                                </div>

                                <p className="mt-4 text-2xl font-semibold text-(--fg)">
                                    {plan.priceMonthly ? `$${formatMoney(plan.priceMonthly)}` : 'Gratis'}
                                </p>
                                <p className="text-xs text-(--fg-muted)">
                                    {plan.priceMonthly ? 'facturación mensual' : 'sin facturación'}
                                </p>

                                <div className="mt-4 space-y-2">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 text-sm">
                                            <IconCheck size={14} className="mt-0.5 shrink-0 text-(--fg-secondary)" />
                                            <span className="text-(--fg-secondary)">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <PanelButton
                                    className="mt-5 w-full"
                                    variant={isCurrent ? 'secondary' : 'primary'}
                                    disabled={!isPaid || isCurrent || busyPlanId === plan.id || !mercadoPagoEnabled}
                                    onClick={() => {
                                        if (plan.id === 'pro' || plan.id === 'enterprise') {
                                            void startCheckout(plan.id);
                                        }
                                    }}
                                >
                                    {busyPlanId === plan.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                                    {isCurrent ? 'Plan activo' : isPaid ? 'Suscribirme' : 'Plan base'}
                                </PanelButton>
                            </article>
                        );
                    })}
                </div>
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Historial de cobros"
                    description="Seguimiento simple de tus órdenes de suscripción."
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
                                        ${formatMoney(order.amount)} · {new Date(order.createdAt).toLocaleString('es-CL')}
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
