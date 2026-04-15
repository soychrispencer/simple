'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconBolt,
    IconCalendar,
    IconClock,
    IconLoader2,
    IconPlayerPause,
    IconPlayerPlay,
    IconX,
} from '@tabler/icons-react';
import ModernSelect from '@/components/ui/modern-select';
import { PanelActions, PanelBlockHeader, PanelButton, PanelCard, PanelEmptyState, PanelNotice, PanelStatusBadge } from '@simple/ui';
import {
    BOOST_SECTION_META,
    activateFreeBoost,
    fetchBoostCatalog,
    fetchBoostOrders,
    updateBoostOrderStatus,
    type BoostOrder,
    type BoostPlan,
    type BoostPlanId,
    type BoostSection,
    type FreeBoostQuota,
} from '@/lib/boost';
import { confirmCheckout, startBoostCheckout } from '@/lib/payments';

function formatMoney(value: number): string {
    return value.toLocaleString('es-CL');
}

function formatDateTime(value: number): string {
    return new Date(value).toLocaleString('es-CL');
}

function boostStatusMeta(status: BoostOrder['status']): { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' } {
    if (status === 'active') return { label: 'Activo', tone: 'success' };
    if (status === 'scheduled') return { label: 'Programado', tone: 'info' };
    if (status === 'paused') return { label: 'Pausado', tone: 'warning' };
    return { label: 'Finalizado', tone: 'neutral' };
}

export default function BoostManager() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);

    const [listings, setListings] = useState<Array<{
        id: string;
        title: string;
        section: BoostSection;
        price: string;
        location: string;
    }>>([]);
    const [plansBySection, setPlansBySection] = useState<Partial<Record<BoostSection, BoostPlan[]>>>({});
    const [reservedBySection, setReservedBySection] = useState<Partial<Record<BoostSection, { used: number; max: number }>>>({});
    const [orders, setOrders] = useState<BoostOrder[]>([]);
    const [freeBoostQuota, setFreeBoostQuota] = useState<FreeBoostQuota>({ max: 0, used: 0, remaining: 0 });

    const [selectedListingId, setSelectedListingId] = useState('');
    const [selectedSection, setSelectedSection] = useState<BoostSection>('sale');
    const [selectedPlanId, setSelectedPlanId] = useState<BoostPlanId>('boost_starter');

    const selectedListing = useMemo(
        () => listings.find((item) => item.id === selectedListingId) ?? null,
        [listings, selectedListingId]
    );
    const sectionPlans = useMemo(() => plansBySection[selectedSection] ?? [], [plansBySection, selectedSection]);
    const selectedPlan = useMemo(
        () => sectionPlans.find((plan) => plan.id === selectedPlanId) ?? sectionPlans[0] ?? null,
        [sectionPlans, selectedPlanId]
    );
    const selectedCapacity = reservedBySection[selectedSection];

    const load = async () => {
        setLoading(true);
        setError('');

        const [catalog, nextOrders] = await Promise.all([fetchBoostCatalog(), fetchBoostOrders()]);

        if (!catalog) {
            setError('No pudimos cargar Boost. Vuelve a iniciar sesión.');
            setLoading(false);
            return;
        }

        setListings(
            catalog.listings.map((item) => ({
                id: item.id,
                title: item.title,
                section: item.section,
                price: item.price,
                location: item.location,
            }))
        );
        setPlansBySection(catalog.plansBySection);
        setReservedBySection(catalog.reserved);
        setFreeBoostQuota(catalog.freeBoostQuota ?? { max: 0, used: 0, remaining: 0 });
        setOrders(nextOrders);

        setLoading(false);
    };

    useEffect(() => {
        load();
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
                setError(result.error ?? 'No pudimos validar el pago del boost.');
                return;
            }

            if (result.status === 'approved' || result.status === 'authorized') {
                setMessage('Boost activado correctamente.');
                await load();
                return;
            }

            if (result.status === 'pending') {
                setMessage('Tu pago quedó pendiente de confirmación en Mercado Pago.');
                return;
            }

            setError('El pago del boost no fue aprobado.');
        })();
    }, [handledPurchaseId, searchParams]);

    useEffect(() => {
        if (listings.length === 0) return;

        const queryListingId = searchParams.get('listingId') ?? '';
        const querySectionRaw = searchParams.get('section');
        const querySection: BoostSection =
            querySectionRaw === 'rent' || querySectionRaw === 'project' ? querySectionRaw : 'sale';

        const fallbackListing = listings[0];
        const matched = listings.find((item) => item.id === queryListingId) ?? fallbackListing;
        if (!matched) return;

        setSelectedListingId(matched.id);
        setSelectedSection(matched.section ?? querySection);
    }, [listings, searchParams]);

    useEffect(() => {
        if (!selectedListing) return;
        setSelectedSection(selectedListing.section);
    }, [selectedListing]);

    useEffect(() => {
        if (!selectedPlan) return;
        setSelectedPlanId(selectedPlan.id);
    }, [selectedPlan?.id]);

    const hasFreeBoosts = freeBoostQuota.remaining === -1 || freeBoostQuota.remaining > 0;

    const handleFreeBoost = async () => {
        if (!selectedListing) {
            setError('Selecciona una publicación para continuar.');
            return;
        }
        if (!selectedPlan) {
            setError('Selecciona un plan para continuar.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        const result = await activateFreeBoost({
            listingId: selectedListing.id,
            section: selectedSection,
            planId: selectedPlan.id,
        });

        if (!result.ok) {
            setError(result.error ?? 'No pudimos activar el boost gratuito.');
            setSaving(false);
            return;
        }

        setMessage('¡Boost gratuito activado correctamente!');
        setSaving(false);
        await load();
    };

    const activateBoost = async () => {
        if (!selectedListing) {
            setError('Selecciona una publicación para continuar.');
            return;
        }
        if (!selectedPlan) {
            setError('Selecciona un plan para continuar.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        const result = await startBoostCheckout({
            listingId: selectedListing.id,
            section: selectedSection,
            planId: selectedPlan.id,
            returnUrl: `${window.location.origin}/panel/publicidad?tab=boost`,
        });

        if (!result.ok || !result.checkoutUrl) {
            setError(result.error ?? 'No pudimos iniciar el checkout del boost.');
            setSaving(false);
            return;
        }

        window.location.assign(result.checkoutUrl);
    };

    const changeStatus = async (orderId: string, nextStatus: 'active' | 'paused' | 'ended') => {
        const ok = await updateBoostOrderStatus(orderId, nextStatus);
        if (!ok) {
            setError('No pudimos actualizar el estado del boost.');
            return;
        }
        setMessage('Estado del boost actualizado.');
        await load();
    };

    return (
        <div className="space-y-6">
            {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Crear boost"
                    description="Selecciona tu aviso y paga el impulso directamente con Mercado Pago."
                />

                {loading ? (
                    <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : listings.length === 0 ? (
                    <PanelEmptyState
                        title="Sin publicaciones disponibles"
                        description="No tienes publicaciones disponibles para impulsar."
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="space-y-1.5">
                                <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Publicación</span>
                                <ModernSelect
                                    value={selectedListingId}
                                    onChange={(value) => setSelectedListingId(value)}
                                    options={listings.map((listing) => ({
                                        value: listing.id,
                                        label: listing.title,
                                    }))}
                                    ariaLabel="Publicación"
                                    placeholder="Seleccionar publicación"
                                />
                            </label>
                            <label className="space-y-1.5">
                                <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Sección</span>
                                <ModernSelect
                                    value={selectedSection}
                                    onChange={(value) => setSelectedSection(value as BoostSection)}
                                    options={(Object.keys(BOOST_SECTION_META) as BoostSection[]).map((section) => ({
                                        value: section,
                                        label: BOOST_SECTION_META[section].label,
                                    }))}
                                    ariaLabel="Sección"
                                    placeholder="Seleccionar sección"
                                />
                            </label>
                        </div>

                        {selectedListing ? (
                            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>{selectedListing.title}</p>
                                <p style={{ color: 'var(--fg-secondary)' }}>{selectedListing.price} · {selectedListing.location}</p>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {sectionPlans.map((plan) => {
                                const selected = selectedPlan?.id === plan.id;
                                return (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlanId(plan.id)}
                                        className="rounded-xl border p-4 text-left transition-all"
                                        style={{
                                            borderColor: selected ? 'var(--fg)' : 'var(--border)',
                                            background: selected ? 'var(--bg-subtle)' : 'var(--surface)',
                                        }}
                                    >
                                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{plan.name}</p>
                                        <p className="text-xl font-semibold mt-1" style={{ color: 'var(--fg)' }}>
                                            ${formatMoney(plan.price)}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                            {plan.days} días · {plan.visibilityLift}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {hasFreeBoosts ? (
                            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-success)', background: 'rgba(34, 197, 94, 0.06)' }}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                        <IconBolt size={14} className="inline -mt-0.5 mr-1" style={{ color: 'var(--color-success)' }} />
                                        Boosts gratuitos este mes:{' '}
                                        <strong style={{ color: 'var(--fg)' }}>
                                            {freeBoostQuota.remaining === -1 ? 'Ilimitados' : `${freeBoostQuota.remaining} disponible${freeBoostQuota.remaining !== 1 ? 's' : ''}`}
                                        </strong>
                                        {freeBoostQuota.max > 0 ? (
                                            <span className="ml-1" style={{ color: 'var(--fg-muted)' }}>
                                                ({freeBoostQuota.used}/{freeBoostQuota.max} usados)
                                            </span>
                                        ) : null}
                                    </div>
                                    <PanelButton
                                        onClick={handleFreeBoost}
                                        disabled={saving || loading || !selectedPlan || !selectedListing}
                                        variant="primary"
                                    >
                                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconBolt size={14} />}
                                        Activar boost gratis
                                    </PanelButton>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <PanelActions
                                className="mt-0 text-sm"
                                left={(
                                    <span style={{ color: 'var(--fg-secondary)' }}>
                                        Cupos en {BOOST_SECTION_META[selectedSection].label.toLowerCase()}:{' '}
                                        <strong style={{ color: 'var(--fg)' }}>
                                            {selectedCapacity?.used ?? 0}/{selectedCapacity?.max ?? 10}
                                        </strong>
                                    </span>
                                )}
                                right={(
                                    <PanelButton
                                        onClick={activateBoost}
                                        disabled={saving || loading || !selectedPlan || !selectedListing}
                                        variant="secondary"
                                    >
                                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconBolt size={14} />}
                                        Pagar boost · ${selectedPlan ? formatMoney(selectedPlan.price) : '...'}
                                    </PanelButton>
                                )}
                            />
                        </div>
                    </>
                )}
            </PanelCard>

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Historial de boosts"
                    description="Campañas activas, pausadas y finalizadas."
                />

                {loading ? (
                    <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : orders.length === 0 ? (
                    <PanelEmptyState
                        title="Sin boosts creados"
                        description="Aún no tienes boosts creados."
                    />
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const pill = boostStatusMeta(order.status);
                            return (
                                <article
                                    key={order.id}
                                    className="rounded-xl border p-4"
                                    style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                                >
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>
                                                {order.listing?.title ?? order.listingId}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                                {order.sectionLabel ?? BOOST_SECTION_META[order.section].label} · {order.planName} · ${formatMoney(order.price)}
                                            </p>
                                        </div>
                                        <PanelStatusBadge label={pill.label} tone={pill.tone} size="sm" />
                                    </div>

                                    <div className="flex items-center gap-4 text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
                                        <span className="inline-flex items-center gap-1">
                                            <IconCalendar size={12} />
                                            {formatDateTime(order.startAt)}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <IconClock size={12} />
                                            hasta {formatDateTime(order.endAt)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-3">
                                        {order.status === 'active' ? (
                                            <PanelButton
                                                onClick={() => changeStatus(order.id, 'paused')}
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                            >
                                                <IconPlayerPause size={12} />
                                                Pausar
                                            </PanelButton>
                                        ) : null}
                                        {order.status === 'paused' ? (
                                            <PanelButton
                                                onClick={() => changeStatus(order.id, 'active')}
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                            >
                                                <IconPlayerPlay size={12} />
                                                Reanudar
                                            </PanelButton>
                                        ) : null}
                                        {order.status !== 'ended' ? (
                                            <PanelButton
                                                onClick={() => changeStatus(order.id, 'ended')}
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                            >
                                                <IconX size={12} />
                                                Finalizar
                                            </PanelButton>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
