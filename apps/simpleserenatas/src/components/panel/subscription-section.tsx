'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PanelBlockHeader, PanelButton, PanelCard, PanelNotice, usePanelConfirm } from '@simple/ui/panel';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { confirmCheckout, startSubscriptionCheckout } from '@/lib/payments';
import { profileSectionHref } from '@/lib/account-tab';
import { serenatasApi, type SerenataMePlan } from '@/lib/serenatas-api';

type Notice = { ok: string | null; error: string | null; loading: boolean };

function formatCurrency(value: number): string {
    return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function parseMePlanResponse(response: Awaited<ReturnType<typeof serenatasApi.mePlan>>): SerenataMePlan | null {
    if (!response.ok) return null;
    if (response.plan !== 'free' && response.plan !== 'pro') return null;
    return {
        plan: response.plan,
        planLabel: response.planLabel ?? (response.plan === 'pro' ? 'Pro' : 'Gratis'),
        alwaysFreeMonthly: response.alwaysFreeMonthly ?? true,
        ownerOwnSerenataCommissionPercent: response.ownerOwnSerenataCommissionPercent ?? 0,
        commissionAppBps: response.commissionAppBps ?? (response.plan === 'pro' ? 800 : 1500),
        commissionAppPercent: response.commissionAppPercent ?? (response.plan === 'pro' ? 8 : 15),
        commissionVatBps: response.commissionVatBps ?? 1900,
        commissionVatPercent: response.commissionVatPercent ?? 19,
        proPriceMonthly: response.proPriceMonthly ?? 19_990,
        proPriceMonthlyNet: response.proPriceMonthlyNet ?? response.proPriceMonthly ?? 19_990,
        proPriceMonthlyWithVat: response.proPriceMonthlyWithVat ?? Math.round((response.proPriceMonthlyNet ?? 19_990) * 1.19),
        proCheckoutAvailable: response.proCheckoutAvailable ?? false,
        exampleGrossClp: response.exampleGrossClp ?? 100_000,
        example: response.example ?? {
            grossClp: 100_000,
            commissionClp: 0,
            vatOnCommissionClp: 0,
            totalDeductionClp: 0,
        },
        constants: response.constants ?? {
            APP_COMMISSION_FREE_BPS: 1500,
            APP_COMMISSION_PRO_BPS: 800,
            COMMISSION_VAT_BPS: 1900,
        },
    };
}

function isSamePageSubscriptionReturn(checkoutUrl: string): { purchaseId: string } | null {
    try {
        const url = new URL(checkoutUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        if (url.searchParams.get('kind') !== 'subscription') return null;
        const purchaseId = url.searchParams.get('purchaseId');
        if (!purchaseId) return null;
        if (typeof window !== 'undefined' && url.origin !== window.location.origin) return null;
        return { purchaseId };
    } catch {
        return null;
    }
}

const FREE_BENEFITS = (commission: number) => [
    'Sin cuota mensual',
    'Perfil público para recibir solicitudes desde SimpleSerenatas',
    'Datos comerciales, servicios, repertorio, agenda y cobertura',
    'Solicitudes y reservas con revisión manual',
    'Serenatas con tu propio cliente: 0% de comisión',
    `Comisión ${commission}% + IVA en serenatas por Simple`,
] as const;

const PRO_BENEFITS = (commission: number) => [
    'Todo lo incluido en Gratis',
    'Menor comisión para vender más desde SimpleSerenatas',
    `Comisión ${commission}% + IVA en serenatas por Simple`,
    'Serenatas con tu propio cliente: 0% de comisión',
    'Finanzas, reportes y pagos a músicos',
    'Chat WhatsApp desde el panel con plantillas de atención',
    'Mejor margen por cada serenata pagada desde la plataforma',
] as const;

function commissionTotal(grossClp: number, commissionPercent: number, vatPercent: number) {
    const commissionClp = Math.round(grossClp * (commissionPercent / 100));
    const vatClp = Math.round(commissionClp * (vatPercent / 100));
    return commissionClp + vatClp;
}

export function SubscriptionSection() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mePlan, setMePlan] = useState<SerenataMePlan | null>(null);
    const [planLoading, setPlanLoading] = useState(true);
    const [checkoutBusy, setCheckoutBusy] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [notice, setNotice] = useState<Notice>({ ok: null, error: null, loading: false });
    const [handledPurchaseId, setHandledPurchaseId] = useState<string | null>(null);
    const { confirm } = usePanelConfirm();

    const loadMePlan = useCallback(async () => {
        setPlanLoading(true);
        const response = await serenatasApi.mePlan();
        const plan = parseMePlanResponse(response);
        if (!plan) {
            setMePlan(null);
            if (!response.ok) {
                setNotice((n) => ({
                    ...n,
                    error: response.error ?? 'No pudimos cargar tu plan.',
                    loading: false,
                }));
            }
        } else {
            setMePlan(plan);
        }
        setPlanLoading(false);
    }, []);

    useEffect(() => {
        void loadMePlan();
    }, [loadMePlan]);

    const finishConfirm = useCallback(
        async (purchaseId: string) => {
            setNotice({ loading: true, error: null, ok: null });
            const result = await confirmCheckout({ orderId: purchaseId });
            if (!result.ok) {
                setNotice({
                    loading: false,
                    error: result.error ?? 'No pudimos confirmar la suscripción.',
                    ok: null,
                });
                return;
            }
            if (result.status === 'authorized' || result.status === 'approved') {
                setNotice({
                    loading: false,
                    error: null,
                    ok: 'Plan Pro activado. Comisión en serenatas por Simple: 8% + IVA.',
                });
            } else if (result.status === 'pending') {
                setNotice({
                    loading: false,
                    error: null,
                    ok: 'Pago pendiente en Mercado Pago. Te avisaremos cuando quede activo.',
                });
            } else {
                setNotice({
                    loading: false,
                    error: 'La suscripción no fue aprobada.',
                    ok: null,
                });
            }
            await loadMePlan();
        },
        [loadMePlan],
    );

    useEffect(() => {
        const purchaseId = searchParams.get('purchaseId');
        const kind = searchParams.get('kind');
        if (kind !== 'subscription' || !purchaseId || handledPurchaseId === purchaseId) return;

        setHandledPurchaseId(purchaseId);
        void (async () => {
            await finishConfirm(purchaseId);
            const params = new URLSearchParams(searchParams.toString());
            params.delete('purchaseId');
            params.delete('kind');
            params.delete('payment_id');
            params.delete('collection_id');
            params.delete('checkout');
            params.set('account_tab', 'subscription');
            const qs = params.toString();
            router.replace(qs ? `/panel/cuenta?${qs}` : '/panel/cuenta?account_tab=subscription', { scroll: false });
        })();
    }, [searchParams, handledPurchaseId, router, finishConfirm]);

    const isPro = mePlan?.plan === 'pro';
    const freeCommission = mePlan?.constants.APP_COMMISSION_FREE_BPS
        ? mePlan.constants.APP_COMMISSION_FREE_BPS / 100
        : 15;
    const proCommission = mePlan?.constants.APP_COMMISSION_PRO_BPS
        ? mePlan.constants.APP_COMMISSION_PRO_BPS / 100
        : 8;
    const proNet = mePlan?.proPriceMonthlyNet ?? 19_990;
    const vatPercent = mePlan?.commissionVatPercent ?? 19;
    const exampleGrossClp = mePlan?.exampleGrossClp ?? 100_000;
    const freeDeduction = commissionTotal(exampleGrossClp, freeCommission, vatPercent);
    const proDeduction = commissionTotal(exampleGrossClp, proCommission, vatPercent);
    const proSavings = Math.max(0, freeDeduction - proDeduction);
    const proCheckoutAvailable = mePlan?.proCheckoutAvailable ?? false;

    const handleSubscribePro = async () => {
        if (isPro || checkoutBusy || !proCheckoutAvailable) return;
        setCheckoutBusy(true);
        setNotice({ loading: false, error: null, ok: null });

        const returnUrl =
            typeof window !== 'undefined'
                ? `${window.location.origin}${profileSectionHref('subscription')}`
                : profileSectionHref('subscription');

        const result = await startSubscriptionCheckout({ planId: 'pro', returnUrl });
        if (!result.ok || !result.checkoutUrl) {
            const alreadyActive = result.error?.toLowerCase().includes('ya está activo') ?? false;
            if (alreadyActive) {
                await loadMePlan();
            }
            setNotice({
                loading: false,
                error: alreadyActive
                    ? 'Ya tienes Pro activo. Si no lo ves, recarga la página.'
                    : (result.error ?? 'No pudimos iniciar el pago con Mercado Pago.'),
                ok: null,
            });
            setCheckoutBusy(false);
            return;
        }

        const inline = isSamePageSubscriptionReturn(result.checkoutUrl);
        if (inline) {
            await finishConfirm(inline.purchaseId);
            setCheckoutBusy(false);
            return;
        }

        window.location.assign(result.checkoutUrl);
    };

    const handleCancelPro = async () => {
        if (!isPro || cancelBusy) return;
        const confirmed = await confirm({
            title: 'Cancelar suscripción Pro',
            message:
                '¿Cancelar la suscripción Pro? Volverás al plan Gratis (comisión 15% + IVA en serenatas por Simple).',
            confirmLabel: 'Cancelar Pro',
            tone: 'danger',
        });
        if (!confirmed) return;
        setCancelBusy(true);
        setNotice({ loading: false, error: null, ok: null });
        const result = await serenatasApi.cancelProSubscription();
        if (!result.ok) {
            setNotice({
                loading: false,
                error: result.error ?? 'No pudimos cancelar la suscripción.',
                ok: null,
            });
            setCancelBusy(false);
            return;
        }
        setNotice({
            loading: false,
            error: null,
            ok: result.message ?? 'Suscripción cancelada. Estás en plan Gratis.',
        });
        await loadMePlan();
        setCancelBusy(false);
    };

    return (
        <div className="grid gap-5">
            {notice.ok ? <PanelNotice tone="success">{notice.ok}</PanelNotice> : null}
            {notice.error ? <PanelNotice tone="error">{notice.error}</PanelNotice> : null}
            {notice.loading ? (
                <PanelNotice tone="neutral">
                    <span className="inline-flex items-center gap-2">
                        <IconLoader2 size={16} className="animate-spin" aria-hidden />
                        Confirmando tu suscripción con Mercado Pago…
                    </span>
                </PanelNotice>
            ) : null}

            <PanelCard size="lg">
                <PanelBlockHeader
                    title="Suscripción"
                    description="Gratis sirve para operar y recibir solicitudes. Pro mantiene todo lo anterior, baja la comisión y activa herramientas avanzadas de operación."
                />

                {planLoading ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <PlanCardSkeleton />
                        <PlanCardSkeleton />
                    </div>
                ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <PlanOptionCard
                            name="Gratis"
                            priceLabel="Sin cuota mensual"
                            priceDetail="Para publicar, configurar tu negocio y recibir solicitudes."
                            benefits={FREE_BENEFITS(freeCommission)}
                            isCurrent={!isPro}
                            summary={`En pagos desde SimpleSerenatas, la comisión es ${freeCommission}% + IVA.`}
                        />

                        <PlanOptionCard
                            name="Pro"
                            priceLabel={`${formatCurrency(proNet)} + IVA`}
                            priceDetail="Facturación mensual con Mercado Pago."
                            benefits={PRO_BENEFITS(proCommission)}
                            isCurrent={isPro}
                            highlighted
                            summary={`En el mismo pago de ${formatCurrency(exampleGrossClp)}, Pro descuenta ${formatCurrency(proSavings)} menos que Gratis.`}
                            footer={
                                isPro ? (
                                    <PanelButton
                                        type="button"
                                        variant="danger"
                                        className="w-full"
                                        disabled={cancelBusy || notice.loading}
                                        onClick={() => void handleCancelPro()}
                                    >
                                        {cancelBusy ? 'Cancelando…' : 'Cancelar suscripción Pro'}
                                    </PanelButton>
                                ) : (
                                    <PanelButton
                                        type="button"
                                        variant="primary"
                                        className="w-full"
                                        disabled={checkoutBusy || notice.loading || !proCheckoutAvailable}
                                        onClick={() => void handleSubscribePro()}
                                    >
                                        {checkoutBusy ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                                                <IconLoader2 size={16} className="animate-spin" aria-hidden />
                                                Procesando…
                                            </span>
                                        ) : (
                                            proCheckoutAvailable ? 'Suscribirme a Pro' : 'Pago no disponible'
                                        )}
                                    </PanelButton>
                                )
                            }
                        />
                    </div>
                )}

                {!planLoading ? (
                    <div
                        className="mt-5 rounded-xl border p-4 text-sm"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}
                    >
                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>
                            Diferencia práctica
                        </p>
                        <p className="mt-1">
                            Si una serenata se paga desde SimpleSerenatas por {formatCurrency(exampleGrossClp)}, Gratis descuenta{' '}
                            <strong style={{ color: 'var(--fg)' }}>{formatCurrency(freeDeduction)}</strong> y Pro descuenta{' '}
                            <strong style={{ color: 'var(--fg)' }}>{formatCurrency(proDeduction)}</strong>. Las serenatas que
                            gestiones con tu propio cliente siguen en 0% de comisión en ambos planes.
                        </p>
                    </div>
                ) : null}
            </PanelCard>
        </div>
    );
}

function PlanCardSkeleton() {
    return <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />;
}

type PlanOptionCardProps = {
    name: string;
    priceLabel: string;
    priceDetail?: string;
    benefits: readonly string[];
    isCurrent: boolean;
    highlighted?: boolean;
    summary?: string;
    footer?: ReactNode;
};

function PlanOptionCard({
    name,
    priceLabel,
    priceDetail,
    benefits,
    isCurrent,
    highlighted = false,
    summary,
    footer,
}: PlanOptionCardProps) {
    return (
        <article
            className="flex h-full flex-col rounded-xl border p-4 sm:p-5"
            style={{
                borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                background: isCurrent
                    ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-subtle))'
                    : highlighted
                      ? 'var(--bg-subtle)'
                      : 'transparent',
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                        {name}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        {priceLabel}
                    </p>
                    {priceDetail ? (
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            {priceDetail}
                        </p>
                    ) : null}
                </div>
                {isCurrent ? (
                    <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                            background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
                            color: 'var(--accent)',
                        }}
                    >
                        Tu plan
                    </span>
                ) : null}
            </div>

            {summary ? (
                <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}>
                    {summary}
                </p>
            ) : null}

            <ul className="mt-4 flex-1 space-y-2">
                {benefits.map((text) => (
                    <li key={text} className="flex items-start gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        <IconCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} aria-hidden />
                        <span>
                            <BenefitText text={text} />
                        </span>
                    </li>
                ))}
            </ul>

            {footer ? <div className="mt-5 pt-1">{footer}</div> : null}
            {isCurrent && !footer ? (
                <p className="mt-5 text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Plan actual
                </p>
            ) : null}
        </article>
    );
}

function BenefitText({ text }: { text: string }) {
    const commissionMatch = text.match(/^(Comisión \d+% \+ IVA)(.*)$/);
    if (commissionMatch) {
        return (
            <>
                <strong className="font-semibold" style={{ color: 'var(--fg)' }}>
                    {commissionMatch[1]}
                </strong>
                {commissionMatch[2]}
            </>
        );
    }
    return <>{text}</>;
}
