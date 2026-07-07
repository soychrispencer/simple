'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    IconArrowRight,
    IconPlayerPause,
    IconPlayerPlay,
    IconRocket,
    IconX,
} from '@tabler/icons-react';
import {
    activateFreeBoost,
    fetchBoostCatalog,
    fetchBoostOrders,
    getBoostSectionMeta,
    getVerticalAdvertisingConfig,
    updateBoostOrderStatus,
    type AdvertisingVertical,
    type BoostOrder,
    type BoostPlan,
    type BoostPlanId,
    type BoostSection,
    type BoostTargetType,
    type ConfirmCheckoutResponse,
    type FreeBoostQuota,
} from '@simple/utils';
import { ModernSelect } from '../modern-select.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelBlockHeader, PanelChoiceCard, PanelNotice, PanelStatusBadge } from './panel-primitives.js';

export type MarketplaceBoostManagerProps = {
    vertical: AdvertisingVertical;
    /** URL de retorno tras Mercado Pago. Si se omite, usa la ruta actual con `?tab=boost`. */
    returnUrl?: string;
    initialListingId?: string | null;
    startBoostCheckout: (input: {
        returnUrl: string;
        listingId: string;
        targetType?: BoostTargetType;
        section: BoostSection;
        planId: BoostPlanId;
    }) => Promise<{ ok: boolean; orderId?: string; checkoutUrl?: string | null; error?: string }>;
    confirmCheckout: (input: {
        orderId: string;
        paymentId?: string | null;
    }) => Promise<ConfirmCheckoutResponse>;
};

function statusLabel(status: BoostOrder['status']) {
    if (status === 'active') return 'Activo';
    if (status === 'scheduled') return 'Programado';
    if (status === 'paused') return 'Pausado';
    return 'Finalizado';
}

function statusTone(status: BoostOrder['status']): 'success' | 'warning' | 'neutral' | 'info' {
    if (status === 'active') return 'success';
    if (status === 'scheduled') return 'info';
    if (status === 'paused') return 'warning';
    return 'neutral';
}

function formatClDate(value: number | string) {
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatClCurrency(value: number) {
    return `$${value.toLocaleString('es-CL')}`;
}

function formatFreeBoostQuotaLabel(quota: FreeBoostQuota): string {
    if (quota.unlimited || quota.max < 0 || quota.remaining < 0) {
        return quota.used > 0 ? `${quota.used} usados · Ilimitados` : 'Ilimitados';
    }
    if (quota.max === 0) {
        return 'No incluido';
    }
    return `${quota.used}/${quota.max}`;
}

function hasFreeBoostAvailable(quota: FreeBoostQuota): boolean {
    if (quota.unlimited || quota.remaining < 0) return true;
    return quota.remaining > 0;
}

function freeBoostButtonLabel(quota: FreeBoostQuota): string {
    if (quota.unlimited || quota.remaining < 0) {
        return 'Usar boost gratis (ilimitado)';
    }
    return `Usar boost gratis (${quota.remaining} restante${quota.remaining === 1 ? '' : 's'})`;
}

function getThemePrefix(vertical: AdvertisingVertical): 'autos' | 'prop' {
    return vertical === 'propiedades' ? 'prop' : 'autos';
}

export function MarketplaceBoostManager({
    vertical,
    returnUrl,
    initialListingId,
    startBoostCheckout,
    confirmCheckout,
}: MarketplaceBoostManagerProps) {
    const config = getVerticalAdvertisingConfig(vertical);
    const theme = getThemePrefix(vertical);
    const isOperatorVertical = vertical === 'agenda' || vertical === 'serenatas';
    const operatorSectionOptions = config.boostSections;
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<BoostOrder[]>([]);
    const [listings, setListings] = useState<Array<{ id: string; title: string; subtitle: string; section: BoostSection; href: string; targetType?: BoostTargetType }>>([]);
    const [plansBySection, setPlansBySection] = useState<Partial<Record<BoostSection, BoostPlan[]>>>({});
    const [reserved, setReserved] = useState<Partial<Record<BoostSection, { used: number; max: number }>>>({});
    const [freeBoostQuota, setFreeBoostQuota] = useState<FreeBoostQuota>({
        max: 0,
        used: 0,
        remaining: 0,
        planId: 'free',
        planName: 'Gratuito',
        unlimited: false,
    });
    const [selectedListingId, setSelectedListingId] = useState('');
    const [selectedSection, setSelectedSection] = useState<BoostSection>('marketplace');
    const [selectedPlanId, setSelectedPlanId] = useState<BoostPlanId>('boost_starter');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);

    const sectionMeta = useMemo(() => getBoostSectionMeta(vertical), [vertical]);

    const selectedListing = useMemo(
        () => listings.find((item) => item.id === selectedListingId) ?? null,
        [listings, selectedListingId],
    );
    const section: BoostSection = isOperatorVertical
        ? selectedSection
        : (selectedListing?.section ?? 'sale');
    const plans = plansBySection[section] ?? [];
    const selectedPlan = plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null;
    const sectionSlots = reserved[section];

    const loadData = useCallback(async () => {
        setLoading(true);
        const [catalog, nextOrders] = await Promise.all([
            fetchBoostCatalog(vertical),
            fetchBoostOrders(vertical),
        ]);

        if (catalog) {
            setListings(catalog.listings);
            setPlansBySection(catalog.plansBySection);
            setReserved(catalog.reserved);
            setFreeBoostQuota(catalog.freeBoostQuota);
        } else {
            setListings([]);
        }

        setOrders(nextOrders);
        setLoading(false);
    }, [vertical]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (!listings.length) return;
        const preferred = initialListingId && listings.some((item) => item.id === initialListingId)
            ? initialListingId
            : listings[0]?.id ?? '';
        setSelectedListingId((current) => current || preferred);
    }, [initialListingId, listings]);

    useEffect(() => {
        if (!isOperatorVertical || operatorSectionOptions.length === 0) return;
        const allowed = operatorSectionOptions.map((item) => item.id as BoostSection);
        if (!allowed.includes(selectedSection)) {
            setSelectedSection(allowed[0] ?? 'marketplace');
        }
    }, [isOperatorVertical, operatorSectionOptions, selectedSection]);

    useEffect(() => {
        if (!plans.length) return;
        if (!plans.some((item) => item.id === selectedPlanId)) {
            setSelectedPlanId(plans[0]?.id ?? 'boost_starter');
        }
    }, [plans, selectedPlanId]);

    useEffect(() => {
        const purchaseId = searchParams.get('purchaseId');
        const tab = searchParams.get('tab');
        if (!purchaseId || tab !== 'boost' || handledPurchaseId === purchaseId) return;

        setHandledPurchaseId(purchaseId);
        setError('');
        setMessage('');

        void (async () => {
            const result = await confirmCheckout({
                orderId: purchaseId,
                paymentId: searchParams.get('payment_id') ?? searchParams.get('collection_id'),
            });

            if (!result.ok) {
                setError(result.error ?? 'No pudimos validar el pago del boost.');
                return;
            }

            if (result.status === 'approved' || result.status === 'authorized') {
                await loadData();
                setMessage('Boost activado correctamente con Mercado Pago.');
                return;
            }

            if (result.status === 'pending') {
                await loadData();
                setMessage('Tu pago quedó pendiente de confirmación en Mercado Pago.');
                return;
            }

            await loadData();
            setError('El pago del boost no fue aprobado.');
        })();
    }, [confirmCheckout, handledPurchaseId, loadData, searchParams]);

    const activateFree = async () => {
        if (!selectedListing || !selectedPlan) return;
        setSubmitting(true);
        setError('');
        setMessage('');

        const result = await activateFreeBoost(vertical, {
            listingId: selectedListing.id,
            targetType: selectedListing.targetType,
            section,
            planId: selectedPlan.id,
        });

        setSubmitting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos activar el boost gratuito.');
            return;
        }

        await loadData();
        setMessage('Boost gratuito activado.');
    };

    const startPaidCheckout = async () => {
        if (!selectedListing || !selectedPlan) return;
        setSubmitting(true);
        setError('');
        setMessage('');

        const resolvedReturnUrl = returnUrl ?? (typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}?tab=boost`
            : '');

        const checkout = await startBoostCheckout({
            returnUrl: resolvedReturnUrl,
            listingId: selectedListing.id,
            targetType: selectedListing.targetType,
            section,
            planId: selectedPlan.id,
        });

        setSubmitting(false);
        if (!checkout.ok || !checkout.checkoutUrl) {
            setError(checkout.error ?? 'No pudimos iniciar el pago del boost.');
            return;
        }

        window.location.assign(checkout.checkoutUrl);
    };

    const togglePause = async (order: BoostOrder) => {
        setError('');
        setMessage('');
        const nextStatus = order.status === 'paused' ? 'active' : 'paused';
        const ok = await updateBoostOrderStatus(order.id, nextStatus);
        if (!ok) {
            setError('No pudimos actualizar el boost.');
            return;
        }
        await loadData();
        setMessage(nextStatus === 'paused' ? 'Boost pausado.' : 'Boost reanudado.');
    };

    const endBoost = async (order: BoostOrder) => {
        setError('');
        setMessage('');
        const ok = await updateBoostOrderStatus(order.id, 'ended');
        if (!ok) {
            setError('No pudimos finalizar el boost.');
            return;
        }
        await loadData();
        setMessage('Boost finalizado.');
    };

    if (loading) {
        return <PanelNotice tone="neutral">Cargando boosts…</PanelNotice>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={`${theme}-stat-tile`}>
                    <p className="type-caption text-[var(--fg-muted)]">Boosts activos</p>
                    <p className="text-xl font-semibold">{orders.filter((item) => item.status === 'active').length}</p>
                </div>
                <div className={`${theme}-stat-tile`}>
                    <p className="type-caption text-[var(--fg-muted)]">Gratis este mes</p>
                    <p className="text-xl font-semibold">{formatFreeBoostQuotaLabel(freeBoostQuota)}</p>
                    {freeBoostQuota.planName ? (
                        <p className="type-caption mt-1 text-[var(--fg-muted)]">Plan {freeBoostQuota.planName}</p>
                    ) : null}
                </div>
                <div className={`${theme}-stat-tile`}>
                    <p className="type-caption text-[var(--fg-muted)]">Cupos {sectionMeta[section]?.label ?? 'sección'}</p>
                    <p className="text-xl font-semibold">
                        {sectionSlots ? `${sectionSlots.used}/${sectionSlots.max}` : '—'}
                    </p>
                </div>
                <div className={`${theme}-stat-tile`}>
                    <p className="type-caption text-[var(--fg-muted)]">Boost de pago</p>
                    <p className="text-xl font-semibold">{selectedPlan ? formatClCurrency(selectedPlan.price) : '—'}</p>
                </div>
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}

            <PanelCard size="md">
                <PanelBlockHeader
                    title={config.copy.boostActivateTitle}
                    description={config.copy.boostActivateDescription}
                />

                {listings.length === 0 ? (
                    <PanelNotice tone="neutral">
                        {config.copy.boostEmptyTargets}{' '}
                        <Link href={config.copy.boostEmptyTargetsLink} className="font-medium underline">
                            Ir a configurar
                        </Link>
                        .
                    </PanelNotice>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="type-caption font-medium mb-1 block text-[var(--fg-secondary)]">
                                {config.copy.boostTargetLabel}
                            </label>
                            <ModernSelect
                                value={selectedListingId}
                                onChange={setSelectedListingId}
                                options={listings.map((item) => ({
                                    value: item.id,
                                    label: item.title,
                                }))}
                                ariaLabel="Seleccionar publicación"
                                placeholder="Seleccionar publicación"
                            />
                            {selectedListing ? (
                                <p className="type-caption mt-2 text-[var(--fg-muted)]">
                                    {selectedListing.subtitle}
                                    {isOperatorVertical ? ` · Visibilidad: ${sectionMeta[section]?.label ?? section}` : ` · Sección: ${sectionMeta[section]?.label ?? section}`}
                                </p>
                            ) : null}
                        </div>

                        {isOperatorVertical ? (
                            <div>
                                <label className="type-caption font-medium mb-1 block text-[var(--fg-secondary)]">
                                    Dónde destacar
                                </label>
                                <ModernSelect
                                    value={selectedSection}
                                    onChange={(value) => setSelectedSection(value as BoostSection)}
                                    options={operatorSectionOptions.map((item) => ({
                                        value: item.id,
                                        label: item.label,
                                    }))}
                                    ariaLabel="Seleccionar sección de visibilidad"
                                    placeholder="Seleccionar sección"
                                />
                            </div>
                        ) : null}

                        {sectionSlots && sectionSlots.used >= sectionSlots.max ? (
                            <PanelNotice tone="warning">
                                No quedan cupos disponibles en {sectionMeta[section]?.label ?? 'esta sección'}. Prueba otra sección o espera a que finalice un boost.
                            </PanelNotice>
                        ) : null}

                        <div>
                            <p className="text-sm font-medium mb-3">Plan de visibilidad</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {plans.map((plan) => (
                                    <PanelChoiceCard
                                        key={plan.id}
                                        selected={selectedPlan?.id === plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-8 h-8 rounded-lg inline-flex items-center justify-center ${theme}-icon-tile`}>
                                                <IconRocket size={16} />
                                            </span>
                                            <p className="text-sm font-semibold">{plan.name}</p>
                                        </div>
                                        <p className="type-caption text-[var(--fg-muted)]">{plan.days} días · hasta {plan.visibilityLift} visibilidad</p>
                                        <p className="text-base font-semibold mt-2">{formatClCurrency(plan.price)}</p>
                                    </PanelChoiceCard>
                                ))}
                            </div>
                        </div>

                        {freeBoostQuota.max === 0 && !freeBoostQuota.unlimited ? (
                            <PanelNotice tone="neutral">
                                Tu plan {freeBoostQuota.planName ?? 'Gratuito'} no incluye boosts gratis este mes.
                                Puedes activar un boost de pago o mejorar a Profesional (3 gratis/mes).
                            </PanelNotice>
                        ) : null}

                        <div className="flex flex-col sm:flex-row gap-2">
                            {hasFreeBoostAvailable(freeBoostQuota) && selectedPlan ? (
                                <PanelButton
                                    onClick={() => void activateFree()}
                                    variant="secondary"
                                    disabled={submitting || !selectedListing}
                                    className="sm:flex-1"
                                >
                                    {freeBoostButtonLabel(freeBoostQuota)}
                                </PanelButton>
                            ) : null}
                            <PanelButton
                                onClick={() => void startPaidCheckout()}
                                variant="primary"
                                disabled={submitting || !selectedListing || !selectedPlan || (sectionSlots?.used ?? 0) >= (sectionSlots?.max ?? 10)}
                                className="sm:flex-1"
                            >
                                Pagar con Mercado Pago <IconArrowRight size={14} />
                            </PanelButton>
                        </div>
                    </div>
                )}
            </PanelCard>

            <PanelCard size="md">
                <PanelBlockHeader title="Tus boosts" description="Pausa, reanuda o finaliza boosts activos." />

                {orders.length === 0 ? (
                    <PanelNotice tone="neutral">Aún no tienes boosts activados.</PanelNotice>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const listing = order.listing;
                            const href = listing?.href;
                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-xl border p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:justify-between ${theme}-border-card`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold truncate">
                                                {listing?.title ?? `Publicación ${order.listingId}`}
                                            </p>
                                            <PanelStatusBadge label={statusLabel(order.status)} tone={statusTone(order.status)} />
                                            {order.price === 0 ? (
                                                <PanelStatusBadge label="Gratis" tone="info" />
                                            ) : null}
                                        </div>
                                        <p className="type-caption mt-1 text-[var(--fg-secondary)]">
                                            {order.sectionLabel ?? sectionMeta[order.section]?.label} · {order.planName} · {order.days} días
                                        </p>
                                        <p className="type-caption mt-1 text-[var(--fg-muted)]">
                                            {formatClDate(order.startAt)} – {formatClDate(order.endAt)}
                                            {order.price > 0 ? ` · ${formatClCurrency(order.price)}` : ''}
                                        </p>
                                        {href ? (
                                            <Link href={href} className="inline-flex mt-2 text-xs font-medium text-[var(--fg-secondary)]">
                                                Ver publicación
                                            </Link>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                                        {order.status === 'active' || order.status === 'scheduled' ? (
                                            <PanelButton onClick={() => void togglePause(order)} variant="secondary" size="sm">
                                                <IconPlayerPause size={14} /> Pausar
                                            </PanelButton>
                                        ) : null}
                                        {order.status === 'paused' ? (
                                            <PanelButton onClick={() => void togglePause(order)} variant="secondary" size="sm">
                                                <IconPlayerPlay size={14} /> Reanudar
                                            </PanelButton>
                                        ) : null}
                                        {order.status !== 'ended' ? (
                                            <PanelButton onClick={() => void endBoost(order)} variant="danger" size="sm">
                                                <IconX size={14} /> Finalizar
                                            </PanelButton>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
