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
    AGENDA_PLAN_CATALOG,
    AGENDA_PRICING,
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

const AGENDA_BUSINESS_QUOTE_MESSAGE = 'Hola, quiero cotizar el plan Empresa de SimpleAgenda. Somos ___ profesionales y tenemos ___ sucursales.';
const AGENDA_BUSINESS_WHATSAPP_HREF = `https://wa.me/56978623828?text=${encodeURIComponent(AGENDA_BUSINESS_QUOTE_MESSAGE)}`;

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
    if (catalog.currentSubscription.providerStatus === 'free') return null;
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
        billingCycle?: 'monthly' | 'annual';
        returnUrl: string;
    }) => Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string; alreadyActive?: boolean; message?: string }>;
    /** Cancela Pro (preapproval MP + downgrade). Opcional: si falta, no se muestra el botón. */
    cancelSubscription?: () => Promise<{ ok: boolean; error?: string; message?: string }>;
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
    cancelSubscription,
    subscriptionsPath = '/panel/mi-cuenta/suscripcion',
    marketplaceMode = false,
    marketplaceVertical,
    launchVertical,
    fetchCompanyBillingContext,
}: SubscriptionManagerProps) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [cancelling, setCancelling] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [currentBillingCycle, setCurrentBillingCycle] = useState<'monthly' | 'annual'>('monthly');
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
        const currentBillingCycle = catalogData.currentSubscription?.billingCycle === 'annual' ? 'annual' : 'monthly';
        setCurrentPlanId(currentPlanId);
        setCurrentBillingCycle(currentBillingCycle);
        const requestedBillingCycle = searchParams.get('billingCycle');
        setBillingCycle(requestedBillingCycle === 'annual' || requestedBillingCycle === 'monthly'
            ? requestedBillingCycle
            : currentBillingCycle);
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

    const agendaBilling = launchVertical === 'agenda';
    const paidPlans = useMemo(
        () => plans.filter((plan) => plan.id === 'pro' || (agendaBilling && plan.id === 'pro_plus')),
        [agendaBilling, plans],
    );

    const trial = useMemo(() => trialMeta(catalog, currentPlanId), [catalog, currentPlanId]);
    const proPlan = paidPlans.find((plan) => plan.id === 'pro') ?? null;
    const currentPaidPlan = paidPlans.find((plan) => plan.id === currentPlanId) ?? proPlan;
    const proPlusPlan = paidPlans.find((plan) => plan.id === 'pro_plus') ?? null;
    const selectedBillingCycle = agendaBilling ? billingCycle : 'monthly';
    const isAnnualBilling = selectedBillingCycle === 'annual';
    const subscriptionPromotion = currentPlanId === 'free' && !isAnnualBilling ? proPlan?.promotion ?? null : null;
    const summaryPlanPrice = currentPaidPlan?.priceMonthly ?? proPlan?.priceMonthly ?? 0;
    const selectedProPrice = isAnnualBilling
        ? AGENDA_PRICING.proAnnualTotalNetClp
        : subscriptionPromotion?.priceMonthly ?? proPlan?.priceMonthly ?? 0;
    const selectedProPlusPrice = isAnnualBilling
        ? AGENDA_PRICING.proPlusAnnualTotalNetClp
        : proPlusPlan?.priceMonthly ?? 0;
    const summaryBillingPrice = currentPlanId === 'pro_plus' ? selectedProPlusPrice : selectedProPrice;
    const currentCycleLabel = currentBillingCycle === 'annual' ? 'anual' : 'mensual';
    const selectedCycleLabel = isAnnualBilling ? 'anual' : 'mensual';

    const startCheckout = async (planId: Exclude<SubscriptionPlanId, 'free'>) => {
        setBusyPlanId(planId);
        setError('');
        setMessage('');

        const result = await startSubscriptionCheckout({
            planId,
            billingCycle: selectedBillingCycle,
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

    const handleCancelSubscription = async () => {
        if (!cancelSubscription || (currentPlanId !== 'pro' && currentPlanId !== 'pro_plus') || cancelling) return;
        const confirmed = window.confirm(
            agendaBilling
                ? `¿Cancelar tu plan ${currentPlanName}? Dejarás de renovar el cobro y tu cuenta pasará a Gratis. Mantendrás tus datos, tu perfil público y hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes; las canceladas también cuentan.`
                : `¿Cancelar tu plan ${currentPlanName}? Dejarás de renovar el cobro en Mercado Pago y el acceso a funciones pagadas terminará. Tu configuración se mantiene guardada.`,
        );
        if (!confirmed) return;

        setCancelling(true);
        setError('');
        setMessage('');
        try {
            const result = await cancelSubscription();
            if (!result.ok) {
                setError(result.error ?? 'No pudimos cancelar la suscripción.');
                return;
            }
            setMessage(result.message ?? 'Suscripción cancelada.');
            await load();
        } catch {
            setError('No pudimos comprobar la cancelación. Actualiza la página para revisar el estado de tu plan.');
        } finally {
            setCancelling(false);
        }
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
                            label={trial.isExpired ? (agendaBilling ? 'Ahora estás en Gratis' : 'Prueba expirada') : 'Prueba gratuita activa'}
                            tone={trial.isExpired ? (agendaBilling ? 'neutral' : 'warning') : 'info'}
                        />
                        {!trial.isExpired ? (
                            <span className="rounded-full border border-(--border) bg-(--surface) px-2.5 py-0.5 text-xs font-semibold text-(--fg-secondary)">
                                {trial.daysRemaining} {trial.daysRemaining === 1 ? 'día restante' : 'días restantes'}
                            </span>
                        ) : null}
                    </div>
                    <h3 className="text-lg font-semibold text-(--fg)">
                        {trial.isExpired
                            ? (agendaBilling ? 'Tu cuenta sigue disponible en Gratis' : 'Activa Pro para seguir usando el panel')
                            : 'Tienes acceso completo durante tu prueba'}
                    </h3>
                    <p className="mt-1 text-sm text-(--fg-secondary)">
                        {trial.isExpired
                            ? (agendaBilling
                                ? `Tu perfil público y tus datos se mantienen. Gratis incluye hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes (las canceladas también cuentan), ${AGENDA_PRICING.free.activeServices} servicios y ${AGENDA_PRICING.free.activeLocations} ubicación; no hay cobro automático.`
                                : 'Tu configuración se mantiene guardada. Solo falta activar Pro para volver a operar.')
                            : 'Puedes activar Pro ahora o esperar al fin de la prueba. Sin permanencia.'}
                    </p>
                </div>
            ) : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title={currentPlanId === 'pro' ? 'Tu plan Pro' : currentPlanId === 'pro_plus' ? 'Tu plan Pro+' : 'Elige tu plan'}
                    description={
                        currentPlanId === 'pro' || currentPlanId === 'pro_plus'
                            ? `Suscripción ${currentCycleLabel} activa. El cobro se gestiona con ${paymentProviderLabel()}.`
                            : agendaBilling
                                ? 'Elige Pro o Pro+ con pago mensual o anual y cancela cuando quieras.'
                                : 'Un solo plan con todo incluido. Facturación mensual y cancelación cuando quieras.'
                    }
                />

                {agendaBilling ? (
                    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-(--fg)">Frecuencia de pago</p>
                            <p className="mt-1 text-xs leading-relaxed text-(--fg-muted)">
                                {isAnnualBilling
                                    ? 'El plan anual se cobra por adelantado cada 12 meses.'
                                    : 'El pago mensual se renueva cada mes.'}
                            </p>
                        </div>
                        <div className="inline-flex w-full rounded-xl border border-(--border) bg-(--surface) p-1 sm:w-auto" role="group" aria-label="Frecuencia de pago">
                            <button
                                type="button"
                                aria-pressed={!isAnnualBilling}
                                onClick={() => setBillingCycle('monthly')}
                                className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold sm:flex-none ${!isAnnualBilling ? 'bg-(--accent-subtle) text-(--fg)' : 'text-(--fg-secondary)'}`}
                            >
                                Mensual
                            </button>
                            <button
                                type="button"
                                aria-pressed={isAnnualBilling}
                                onClick={() => setBillingCycle('annual')}
                                className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold sm:flex-none ${isAnnualBilling ? 'bg-(--accent-subtle) text-(--fg)' : 'text-(--fg-secondary)'}`}
                            >
                                Anual · Ahorra 20%
                            </button>
                        </div>
                    </div>
                ) : null}

                {loading ? null : proPlan ? (
                    <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch xl:grid-cols-3">
                        <article
                            className={`flex h-full flex-col rounded-card border p-5 sm:p-6 ${
                                        currentPlanId === 'pro' ? 'border-(--accent-border) bg-(--accent-subtle)' : 'border-(--border) bg-(--surface)'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">Plan {selectedCycleLabel}</p>
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
                                    {formatMoney(selectedProPrice, proPlan.currency)}
                                    <span className="ml-1 text-base font-medium text-(--fg-muted)">
                                        {isAnnualBilling ? '+ IVA / año' : proPlan.currency === 'USD' ? '/ mes' : '+ IVA / mes'}
                                    </span>
                                </p>
                                {agendaBilling && isAnnualBilling ? (
                                    <p className="mt-1 text-sm leading-relaxed text-(--fg-secondary)">
                                        Equivale a ${formatMoney(AGENDA_PRICING.proAnnualMonthlyEquivalentNetClp)} + IVA / mes. Total anual estimado: ${formatMoney(monthlyTotalWithVat(selectedProPrice))}. Ahorras {AGENDA_PRICING.proAnnualDiscountPct}%.
                                    </p>
                                ) : proPlan.currency === 'CLP' && subscriptionPromotion ? (
                                    <p className="mt-1 text-sm leading-relaxed text-(--fg-secondary)">
                                        Precio promocional por {subscriptionPromotion.durationMonths} meses. Luego, ${formatMoney(proPlan.priceMonthly, 'CLP')} + IVA / mes.
                                        <br />
                                        Total estimado: ${formatMoney(monthlyTotalWithVat(subscriptionPromotion.priceMonthly), 'CLP')} / mes durante la promoción; después, ${formatMoney(monthlyTotalWithVat(proPlan.priceMonthly), 'CLP')} / mes.
                                    </p>
                                ) : proPlan.currency === 'CLP' ? (
                                    <p className="mt-1 text-sm text-(--fg-secondary)">
                                        Total estimado: ${formatMoney(monthlyTotalWithVat(selectedProPrice), 'CLP')} / mes
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
                                        <IconCheck size={14} className="mt-0.5 shrink-0 text-accent-ink" />
                                        <span className="text-(--fg-secondary)">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 space-y-2 pt-2">
                                <PanelButton
                                    className="w-full"
                                    variant={currentPlanId === 'pro' ? 'secondary' : 'primary'}
                                    disabled={
                                        currentPlanId !== 'free'
                                        || busyPlanId === proPlan.id
                                        || !checkoutEnabled
                                        || cancelling
                                    }
                                        onClick={() => void startCheckout('pro')}
                                >
                                    {busyPlanId === proPlan.id ? (
                                        <IconLoader2 size={14} className="animate-spin" />
                                    ) : (
                                        <IconCreditCard size={14} />
                                    )}
                                    {currentPlanId === 'pro' && currentBillingCycle === selectedBillingCycle
                                        ? `Plan Pro ${selectedCycleLabel} activo`
                                        : currentPlanId === 'pro'
                                            ? `Cancela tu Pro ${currentCycleLabel} para cambiar a ${selectedCycleLabel}`
                                        : currentPlanId === 'pro_plus'
                                            ? 'Cancela Pro+ para cambiar'
                                            : `Contratar Pro ${selectedCycleLabel} con ${paymentProviderLabel()}`}
                                </PanelButton>
                                {currentPlanId === 'pro' && cancelSubscription ? (
                                    <PanelButton
                                        className="w-full"
                                        variant="danger"
                                        disabled={cancelling || busyPlanId !== null}
                                        loading={cancelling}
                                        onClick={() => void handleCancelSubscription()}
                                    >
                                            Cancelar Pro {currentCycleLabel}
                                    </PanelButton>
                                ) : null}
                            </div>
                        </article>

                        {proPlusPlan ? (
                            <article
                                className={`flex h-full flex-col rounded-card border p-5 sm:p-6 ${
                                    currentPlanId === 'pro_plus' ? 'border-(--accent-border) bg-(--accent-subtle)' : 'border-(--border) bg-(--surface)'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">Plan {selectedCycleLabel}</p>
                                        <h3 className="mt-1 text-2xl font-semibold text-(--fg)">{proPlusPlan.name}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-(--fg-secondary)">{proPlusPlan.description}</p>
                                    </div>
                                    {currentPlanId === 'pro_plus' ? (
                                        <PanelStatusBadge label="Activo" tone="success" />
                                    ) : (
                                        <PanelStatusBadge label="Más completo" tone="info" size="sm" />
                                    )}
                                </div>

                                <div className="mt-6 rounded-xl border border-(--border) bg-(--bg-subtle) p-4">
                                    <p className="text-3xl font-bold tracking-tight text-(--fg)">
                                        ${formatMoney(selectedProPlusPrice, 'CLP')}
                                        <span className="ml-1 text-base font-medium text-(--fg-muted)">{isAnnualBilling ? '+ IVA / año' : '+ IVA / mes'}</span>
                                    </p>
                                    <p className="mt-1 text-sm text-(--fg-secondary)">
                                        {isAnnualBilling
                                            ? <>Equivale a ${formatMoney(AGENDA_PRICING.proPlusAnnualMonthlyEquivalentNetClp)} + IVA / mes. Total anual estimado: ${formatMoney(monthlyTotalWithVat(selectedProPlusPrice))}. Ahorras {AGENDA_PRICING.proAnnualDiscountPct}%.</>
                                            : <>Total estimado: ${formatMoney(monthlyTotalWithVat(selectedProPlusPrice), 'CLP')} / mes</>}
                                    </p>
                                </div>

                                <div className="mt-5 grid flex-1 gap-2 sm:grid-cols-2">
                                    {proPlusPlan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 text-sm">
                                            <IconCheck size={14} className="mt-0.5 shrink-0 text-accent-ink" />
                                            <span className="text-(--fg-secondary)">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 space-y-2 pt-2">
                                    <PanelButton
                                        className="w-full"
                                        variant={currentPlanId === 'pro_plus' ? 'secondary' : 'primary'}
                                        disabled={
                                            currentPlanId !== 'free'
                                            || busyPlanId === proPlusPlan.id
                                            || !checkoutEnabled
                                            || cancelling
                                        }
                                        onClick={() => void startCheckout('pro_plus')}
                                    >
                                        {busyPlanId === proPlusPlan.id ? (
                                            <IconLoader2 size={14} className="animate-spin" />
                                        ) : (
                                            <IconCreditCard size={14} />
                                        )}
                                        {currentPlanId === 'pro_plus' && currentBillingCycle === selectedBillingCycle
                                            ? `Plan Pro+ ${selectedCycleLabel} activo`
                                            : currentPlanId === 'pro_plus'
                                                ? `Cancela tu Pro+ ${currentCycleLabel} para cambiar a ${selectedCycleLabel}`
                                            : currentPlanId === 'pro'
                                                ? 'Cancela Pro para cambiar'
                                                : `Contratar Pro+ ${selectedCycleLabel} con ${paymentProviderLabel()}`}
                                    </PanelButton>
                                    {currentPlanId === 'pro_plus' && cancelSubscription ? (
                                        <PanelButton
                                            className="w-full"
                                            variant="danger"
                                            disabled={cancelling || busyPlanId !== null}
                                            loading={cancelling}
                                            onClick={() => void handleCancelSubscription()}
                                        >
                                            Cancelar Pro+ {currentCycleLabel}
                                        </PanelButton>
                                    ) : null}
                                </div>
                            </article>
                        ) : null}

                        <aside className="flex h-full flex-col gap-4 rounded-card border border-(--border) bg-(--bg-subtle) p-5 sm:p-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-(--fg-muted)">Resumen</p>
                                <h4 className="mt-1 text-lg font-semibold text-(--fg)">
                                    {currentPlanId === 'pro' || currentPlanId === 'pro_plus' ? 'Tu suscripción' : 'Antes de activar'}
                                </h4>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-accent-ink">
                                        <IconClockHour4 size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">{agendaBilling ? `Prueba Pro de ${AGENDA_PRICING.trialDays} días` : 'Prueba de 30 días'}</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            {trial?.isExpired
                                                ? (agendaBilling
                                                    ? `Tu cuenta continúa en Gratis, con perfil público y ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes; las canceladas también cuentan.`
                                                    : 'Tu prueba terminó. Pro reactiva el acceso completo.')
                                                : trial
                                                    ? `Te quedan ${trial.daysRemaining} días con todo incluido.`
                                                    : agendaBilling && currentPlanId === 'free'
                                                        ? 'Tu cuenta sigue en Gratis. No hay cobro automático.'
                                                        : 'Al registrarte tuviste acceso completo para configurar tu cuenta.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-accent-ink">
                                        <IconShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">Sin permanencia</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            {cancelSubscription
                                                ? 'Cancela cuando quieras desde este panel. Tus datos permanecen en tu cuenta.'
                                                : `Cancela cuando quieras desde ${paymentProviderLabel()}. Tus datos permanecen en tu cuenta.`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-subtle) text-accent-ink">
                                        <IconReceipt size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-(--fg)">Cobro transparente</p>
                                        <p className="text-xs leading-relaxed text-(--fg-muted)">
                                            {subscriptionPromotion ? (
                                                <>Neto ${formatMoney(subscriptionPromotion.priceMonthly)} + IVA 19% por {subscriptionPromotion.durationMonths} meses; luego ${formatMoney(summaryPlanPrice)} + IVA al mes.</>
                                            ) : agendaBilling && isAnnualBilling ? (
                                                <>Neto anual ${formatMoney(summaryBillingPrice)} + IVA 19% (${formatMoney(monthlyTotalWithVat(summaryBillingPrice) - summaryBillingPrice)}). El cobro se renueva cada 12 meses.</>
                                            ) : (
                                                <>Neto mensual ${formatMoney(summaryBillingPrice)} + IVA 19% (${formatMoney(monthlyTotalWithVat(summaryBillingPrice) - summaryBillingPrice)}).</>
                                            )}
                                            {' '}El checkout de Mercado Pago muestra el monto final.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto rounded-xl border border-dashed border-(--border) p-4 text-xs leading-relaxed text-(--fg-muted)">
                                {currentPlanId === 'pro' || currentPlanId === 'pro_plus' ? (
                                    <>
                                        Estás en <strong className="text-(--fg)">{currentPlanName}</strong> con pago {currentCycleLabel}.
                                        {' '}El historial de órdenes aparece abajo.
                                    </>
                                ) : (
                                    <>
                                        Hoy estás en <strong className="text-(--fg)">{currentPlanName}</strong>.
                                        {' '}{agendaBilling
                                            ? 'Al activar Pro mantienes tu configuración y desbloqueas las funciones completas.'
                                            : 'Al activar Pro mantienes tu configuración y sigues operando sin límites.'}
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                ) : (
                    <PanelNotice tone="neutral">No hay planes de pago disponibles en este momento.</PanelNotice>
                )}
            </PanelCard>

            {agendaBilling ? (
                <PanelCard size="lg">
                    <PanelBlockHeader
                        title="¿Tienes un equipo o varias sucursales?"
                        description={AGENDA_PLAN_CATALOG.business.description}
                    />
                    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                        <ul className="grid gap-3 text-sm text-(--fg-secondary) sm:grid-cols-2">
                            {AGENDA_PLAN_CATALOG.business.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-2">
                                    <IconCheck size={14} className="mt-0.5 shrink-0 text-(--fg-muted)" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                            <a href={AGENDA_BUSINESS_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-button bg-(--accent) px-4 text-sm font-semibold text-(--accent-ink)">
                                Cotizar por WhatsApp
                            </a>
                        </div>
                    </div>
                </PanelCard>
            ) : null}

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
                                        ${formatMoney(order.amount)}{agendaBilling && order.currency === 'CLP' ? ' (IVA incluido)' : ' + IVA'} · {new Date(order.createdAt).toLocaleString('es-CL')}
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
