'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconCheck, IconCreditCard, IconClockHour4, IconLoader2, IconReceipt, IconShieldCheck } from '@tabler/icons-react';
import type {
    ConfirmCheckoutResponse,
    PaymentOrderStatus,
    PaymentOrderView,
    PublicProfileVertical,
    SubscriptionCatalogResponse,
    SubscriptionPlan,
    SubscriptionPlanId,
} from '@simple/utils';
import {
    fetchAccountBusinessLegal,
    fetchAccountPublicProfile,
    isPlatformLaunchActive,
    PLATFORM_LAUNCH_APP_LABELS,
    type PlatformLaunchVertical,
} from '@simple/utils';
import { AccountSubscriptionBillingModal } from './account-subscription-billing-modal.js';
import { ACCOUNT_SUBSCRIPTION_BILLING_BUTTON } from './account-copy.js';
import { SUBSCRIPTION_BILLING_HISTORY } from './finance-copy.js';
import { PanelButton } from './panel-button';
import { PanelCard } from './panel-card';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from './panel-primitives';
import { MarketplaceSubscriptionLaunchNotice } from './marketplace-subscription-launch-notice.js';

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
    const rawDays = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.min(rawDays, 30);
    return { daysRemaining, isExpired: daysRemaining === 0, expiresAt };
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

function isCompanyBillingComplete(legal: {
    businessLegalName: string | null;
    businessTaxId: string | null;
    billingAddressId: string | null;
} | null): boolean {
    return Boolean(
        legal?.businessLegalName?.trim()
        && legal?.businessTaxId?.trim()
        && legal?.billingAddressId,
    );
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
    }) => Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string; alreadyActive?: boolean; message?: string }>;
};

export type SubscriptionManagerProps = SubscriptionManagerPayments & {
    subscriptionsPath?: string;
    /** Muestra aviso de capacidad (avisos + perfil) vs identidad de operador. */
    marketplaceMode?: boolean;
    /** Vertical marketplace para detectar operador empresa. */
    marketplaceVertical?: PublicProfileVertical;
    /** Vertical con modo lanzamiento (Agenda, Serenatas, o marketplace). */
    launchVertical?: PlatformLaunchVertical;
    /** Apps sin perfil marketplace (ej. Agenda) pueden resolver si el operador es empresa. */
    fetchCompanyBillingContext?: () => Promise<{ isCompany: boolean } | null>;
};

export function SubscriptionManager({
    fetchSubscriptionCatalog,
    confirmCheckout,
    startSubscriptionCheckout,
    subscriptionsPath = '/panel/mi-cuenta/suscripcion',
    marketplaceMode = false,
    marketplaceVertical,
    launchVertical,
    fetchCompanyBillingContext,
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
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [isCompanyOperator, setIsCompanyOperator] = useState(false);
    const [companyBillingComplete, setCompanyBillingComplete] = useState(false);

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
        const currentPlanId = catalogData.currentSubscription?.planId ?? catalogData.freePlan?.id ?? 'free';
        setCurrentPlanId(currentPlanId);
        setCurrentPlanName(
            catalogData.currentSubscription?.planName ?? catalogData.freePlan?.name ?? 'Gratuito',
        );
        await loadCompanyBillingContext();
        setLoading(false);
    };

    const loadCompanyBillingContext = async () => {
        const legal = await fetchAccountBusinessLegal();
        setCompanyBillingComplete(isCompanyBillingComplete(legal));

        if (fetchCompanyBillingContext) {
            const context = await fetchCompanyBillingContext();
            setIsCompanyOperator(Boolean(context?.isCompany));
            return;
        }

        if (marketplaceVertical) {
            const profileResponse = await fetchAccountPublicProfile(marketplaceVertical);
            setIsCompanyOperator(profileResponse?.profile?.accountKind === 'company');
            return;
        }

        setIsCompanyOperator(false);
    };

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        if (searchParams.get('billing') === '1') {
            setBillingModalOpen(true);
        }
    }, [searchParams]);

    const applyConfirmResult = async (result: Awaited<ReturnType<typeof confirmCheckout>>) => {
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
    };

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
            await applyConfirmResult(await confirmCheckout(payload));
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

        if (result.alreadyActive) {
            setMessage(result.message ?? 'Tu plan ya está activo.');
            setBusyPlanId(null);
            await load();
            return;
        }

        if (!result.ok || !result.checkoutUrl) {
            setError(result.error ?? 'No pudimos iniciar la suscripción.');
            setBusyPlanId(null);
            return;
        }

        try {
            const target = new URL(result.checkoutUrl, window.location.href);
            const purchaseId = target.searchParams.get('purchaseId') ?? result.orderId;
            const isDevReturn =
                target.origin === window.location.origin
                && target.searchParams.get('checkout') === 'return'
                && Boolean(purchaseId);

            if (isDevReturn && purchaseId) {
                await applyConfirmResult(await confirmCheckout({ orderId: purchaseId }));
                setBusyPlanId(null);
                return;
            }
        } catch {
            // Si la URL no es parseable, seguimos con redirección clásica.
        }

        window.location.assign(result.checkoutUrl);
    };

    const freeListingLimit = catalog?.freePlan?.maxListings ?? 3;

    const effectiveLaunchVertical: PlatformLaunchVertical | null =
        launchVertical
        ?? (marketplaceVertical === 'autos' || marketplaceVertical === 'propiedades'
            ? marketplaceVertical
            : null);

    if (effectiveLaunchVertical && isPlatformLaunchActive(effectiveLaunchVertical)) {
        return (
            <MarketplaceSubscriptionLaunchNotice
                appLabel={PLATFORM_LAUNCH_APP_LABELS[effectiveLaunchVertical]}
            />
        );
    }

    return (
        <div className="space-y-6">
            {marketplaceMode && !loading ? (
                <PanelNotice tone="neutral">
                    Pro aumenta tu cupo de avisos activos y permite activar tu perfil público. El plan gratuito incluye hasta {freeListingLimit} avisos. Particular, profesional o empresa se elige en Mi negocio.
                </PanelNotice>
            ) : null}
            {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {!checkoutEnabled && !loading ? (
                <PanelNotice tone="warning">
                    Mercado Pago aún no está disponible en este entorno.
                </PanelNotice>
            ) : null}
            {!loading && catalog?.checkoutEnabled && catalog.mercadoPagoEnabled === false ? (
                <PanelNotice tone="info">
                    Modo desarrollo: al suscribirte se simula el pago y el plan queda activo sin ir a Mercado Pago. En producción el cobro es real.
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

                {loading ? null : proPlan ? (
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
                                        {' '}El historial de órdenes aparece abajo.
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
                    actions={(
                        <PanelButton variant="secondary" size="sm" onClick={() => setBillingModalOpen(true)}>
                            {ACCOUNT_SUBSCRIPTION_BILLING_BUTTON}
                        </PanelButton>
                    )}
                />

                {isCompanyOperator && !companyBillingComplete && !loading ? (
                    <PanelNotice tone="warning" className="mb-4">
                        Operas como empresa: completa tus datos de facturación para boletas o facturas de tu suscripción.
                    </PanelNotice>
                ) : null}

                {loading ? null : orders.length === 0 ? (
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

            <AccountSubscriptionBillingModal
                open={billingModalOpen}
                onClose={() => setBillingModalOpen(false)}
                onSaved={() => void loadCompanyBillingContext()}
            />
        </div>
    );
}
