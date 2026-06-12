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
    subscriptionsPath = '/panel/mi-cuenta/suscripcion',
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
        setPlans(catalogData.plans);
        setFreePlan(catalogData.freePlan);
        setOrders(catalogData.orders);
        setMercadoPagoEnabled(catalogData.mercadoPagoEnabled);
        setCurrentPlanId(catalogData.currentSubscription?.planId ?? catalogData.freePlan?.id ?? 'free');
        setCurrentPlanName(catalogData.currentSubscription?.planName ?? catalogData.freePlan?.name ?? 'Gratuito');
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
            {!mercadoPagoEnabled && !loading ? (
                <PanelNotice tone="warning">Mercado Pago aún no está disponible en este entorno.</PanelNotice>
            ) : null}

            {/* Banner de prueba gratuita */}
            {!loading && currentPlanId === 'free' && catalog?.currentSubscription && catalog.currentSubscription.planExpiresAt ? (
                (() => {
                    const expiresAt = new Date(catalog.currentSubscription.planExpiresAt);
                    const now = new Date();
                    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const isExpired = daysRemaining === 0;
                    return (
                        <div className={`rounded-2xl border p-5 ${isExpired ? 'bg-red-50 border-red-200' : ''}`} style={!isExpired ? { background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))', borderColor: 'rgba(59, 130, 246, 0.3)' } : {}}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isExpired ? 'bg-red-200 text-red-700' : ''}`} style={!isExpired ? { background: 'rgba(59, 130, 246, 0.2)', color: 'rgb(59, 130, 246)' } : {}}>
                                            {isExpired ? 'Prueba expirada' : 'Prueba gratuita activa'}
                                        </span>
                                        {!isExpired && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-700">
                                                {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                                        {isExpired ? 'Tu prueba gratuita ha terminado' : 'Disfruta 30 días de acceso completo'}
                                    </h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                        {isExpired 
                                            ? 'Elige Esencial o Pro para continuar operando todas las funciones.' 
                                            : 'Tu prueba está activa. Elige Esencial o Pro para continuar operando.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })()
            ) : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Plan actual"
                    description={currentPlanId === 'free' ? 'Estás en prueba gratuita. Elige un plan para continuar.' : 'Gestiona tu suscripción mensual para publicar y vender mejor.'}
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
                                    {currentPlan?.priceMonthly ? `$${formatMoney(currentPlan.priceMonthly)} + IVA / mes` : 'Sin costo mensual'}
                                </p>
                            </div>
                            <PanelStatusBadge
                                label={currentPlanId === 'free' ? 'Prueba gratuita' : 'Suscrito'}
                                tone={currentPlanId === 'free' ? 'info' : 'success'}
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
                    {plans.filter(plan => plan.id !== 'free').map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const isPaid = plan.priceMonthly > 0 && plan.id !== 'free';
                        return (
                            <article
                                key={plan.id}
                                className={`flex flex-col h-full rounded-card border p-5 ${isCurrent ? 'border-(--fg) bg-(--bg-subtle)' : 'border-(--border) bg-(--surface)'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-(--fg)">{plan.name}</p>
                                        <p className="mt-1 text-sm text-(--fg-secondary)">{plan.description}</p>
                                    </div>
                                    {plan.recommended ? <PanelStatusBadge label="Recomendado" tone="info" size="sm" /> : null}
                                </div>

                                <p className="mt-4 text-2xl font-semibold text-(--fg)">
                                    {plan.priceMonthly ? `$${formatMoney(plan.priceMonthly)} + IVA` : 'Gratis'}
                                </p>
                                <p className="text-xs text-(--fg-muted)">
                                    {plan.priceMonthly ? 'facturación mensual + IVA' : 'sin facturación'}
                                </p>

                                <div className="mt-4 flex-1 space-y-2">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 text-sm">
                                            <IconCheck size={14} className="mt-0.5 shrink-0 text-(--fg-secondary)" />
                                            <span className="text-(--fg-secondary)">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pt-5">
                                    <PanelButton
                                        className="w-full"
                                        variant={isCurrent ? 'secondary' : 'primary'}
                                        disabled={!isPaid || isCurrent || busyPlanId === plan.id || !mercadoPagoEnabled}
                                        onClick={() => {
                                            if (plan.id !== 'free') {
                                                void startCheckout(plan.id as Exclude<SubscriptionPlanId, 'free'>);
                                            }
                                        }}
                                    >
                                        {busyPlanId === plan.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconCreditCard size={14} />}
                                        {isCurrent ? 'Plan activo' : isPaid ? 'Suscribirme' : 'Plan base'}
                                    </PanelButton>
                                </div>
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
