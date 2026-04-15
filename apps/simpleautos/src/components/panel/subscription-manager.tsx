'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconCreditCard, IconLoader2 } from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type PaymentOrderStatus,
    type PaymentOrderView,
    type SubscriptionPlan,
} from '@/lib/payments';

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

export default function SubscriptionManager() {
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

    const startCheckout = async (planId: 'pro' | 'enterprise') => {
        setBusyPlanId(planId);
        setError('');
        setMessage('');

        const result = await startSubscriptionCheckout({
            planId,
            returnUrl: `${window.location.origin}/panel/suscripciones`,
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
                    <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : (
                    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Actualmente activo</p>
                                <h3 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{currentPlanName}</h3>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    {currentPlan?.priceMonthly ? `$${formatMoney(currentPlan.priceMonthly)} / mes` : 'Sin costo mensual'}
                                </p>
                            </div>
                            <PanelStatusBadge
                                label={currentPlanId === 'free' ? 'Base' : 'Suscrito'}
                                tone={currentPlanId === 'free' ? 'neutral' : 'success'}
                            />
                        </div>
                        {currentPlan?.features?.length ? (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {currentPlan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-2 text-sm">
                                        <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-secondary)' }} />
                                        <span style={{ color: 'var(--fg-secondary)' }}>{feature}</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const isPaid = plan.priceMonthly > 0 && plan.id !== 'free';
                        return (
                            <article
                                key={plan.id}
                                className="rounded-2xl border p-5"
                                style={{
                                    borderColor: isCurrent ? 'var(--fg)' : 'var(--border)',
                                    background: isCurrent ? 'var(--bg-subtle)' : 'var(--surface)',
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{plan.name}</p>
                                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>{plan.description}</p>
                                    </div>
                                    {plan.recommended ? <PanelStatusBadge label="Recomendado" tone="info" size="sm" /> : null}
                                </div>

                                <p className="mt-4 text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                                    {plan.priceMonthly ? `$${formatMoney(plan.priceMonthly)}` : 'Gratis'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {plan.priceMonthly ? 'facturación mensual' : 'sin facturación'}
                                </p>

                                <div className="mt-4 space-y-2">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 text-sm">
                                            <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-secondary)' }} />
                                            <span style={{ color: 'var(--fg-secondary)' }}>{feature}</span>
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
                    <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : orders.length === 0 ? (
                    <PanelNotice tone="neutral">Aún no tienes órdenes de suscripción.</PanelNotice>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className="rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                            >
                                <div>
                                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{order.title}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
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
