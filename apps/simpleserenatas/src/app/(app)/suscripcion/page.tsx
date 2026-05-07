'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    IconCheck,
    IconLoader,
    IconCreditCard,
    IconArrowLeft,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { useToast } from '@/hooks';

/** Alineado con `COORDINATOR_MONTHLY_PRICE_CLP` en el API (`constants.ts`). */
const COORDINATOR_PRICE_CLP = 4990;

const COORDINATOR_FEATURES = [
    'Panel completo: agenda, solicitudes, grupos, mapa y seguimiento',
    'Serenatas propias (own_lead) sin comisión de plataforma',
    'Leads de plataforma con comisión 8% + IVA sobre el monto',
];

const PENDING_KEY = 'serenatas:subscription:pendingPaymentId';

/** Alineado con `isCoordinatorSubscriptionActive` en el API. */
function isPaidCoordinatorSubscriptionActive(p: {
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: string | null;
} | null): boolean {
    if (!p) return false;
    if ((p.subscriptionPlan ?? '') === 'free') return false;
    if (p.subscriptionStatus !== 'active') return false;
    if (p.subscriptionEndsAt) {
        const t = new Date(p.subscriptionEndsAt).getTime();
        if (Number.isFinite(t) && t < Date.now()) return false;
    }
    return true;
}

export default function SuscripcionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { coordinatorProfile, refreshProfile } = useAuth();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);

    const subscriptionActive = useMemo(
        () => isPaidCoordinatorSubscriptionActive(coordinatorProfile),
        [coordinatorProfile]
    );

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const checkoutRes = await fetch(
                `${API_BASE}/api/serenatas/payments/subscription/checkout`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({}),
                }
            );
            const checkoutData = await checkoutRes.json().catch(() => ({}));

            if (checkoutRes.ok && checkoutData?.ok && checkoutData.redirectUrl) {
                if (typeof window !== 'undefined' && checkoutData.subscriptionPaymentId) {
                    window.sessionStorage.setItem(PENDING_KEY, String(checkoutData.subscriptionPaymentId));
                }
                window.location.href = checkoutData.redirectUrl as string;
                return;
            }

            if (checkoutData?.code === 'MERCADOPAGO_NOT_CONFIGURED') {
                const fallbackRes = await fetch(`${API_BASE}/api/serenatas/payments/subscription`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({}),
                });
                const fallback = await fallbackRes.json().catch(() => ({}));
                if (fallbackRes.ok && fallback?.ok) {
                    showToast('Suscripción activada (modo desarrollo).', 'success');
                    await refreshProfile?.();
                    router.push('/inicio');
                    return;
                }
                showToast(fallback?.error || 'No pudimos activar la suscripción', 'error');
                return;
            }

            showToast(checkoutData?.error || 'No pudimos iniciar el pago', 'error');
        } catch (error) {
            console.error('Error:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubscriptionReturn = useCallback(
        async (paymentId: string, subscriptionPaymentId: string) => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/serenatas/payments/subscription/mercadopago/confirm`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ paymentId, subscriptionPaymentId }),
                    }
                );
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.ok) {
                    if (data.pending) {
                        showToast('Pago en proceso; te avisamos cuando se acredite.', 'success');
                    } else {
                        showToast(
                            data.alreadyPaid
                                ? 'Tu suscripción ya estaba activa'
                                : 'Suscripción activada',
                            'success'
                        );
                        await refreshProfile?.();
                    }
                } else {
                    showToast(data?.error || 'No pudimos confirmar el pago', 'error');
                }
            } catch (e) {
                console.error('[suscripcion] confirm:', e);
                showToast('Error de conexión al confirmar el pago', 'error');
            } finally {
                router.replace('/suscripcion');
            }
        },
        [router, showToast, refreshProfile]
    );

    useEffect(() => {
        const paymentId = searchParams.get('payment_id');
        if (!paymentId) return;

        const collectionStatus = searchParams.get('collection_status');
        const stored =
            typeof window !== 'undefined'
                ? window.sessionStorage.getItem(PENDING_KEY)
                : null;

        if (typeof window !== 'undefined' && stored) {
            window.sessionStorage.removeItem(PENDING_KEY);
        }

        if (collectionStatus === 'failure' || collectionStatus === 'null') {
            showToast('El pago no se completó o fue rechazado', 'error');
            router.replace('/suscripcion');
            return;
        }

        if (!stored) {
            showToast('No pudimos asociar el pago a una suscripción', 'error');
            router.replace('/suscripcion');
            return;
        }

        void handleSubscriptionReturn(paymentId, stored);
    }, [searchParams, router, showToast, handleSubscriptionReturn]);

    useEffect(() => {
        if (subscriptionActive) setShowPayment(false);
    }, [subscriptionActive]);

    const showPaymentFlow = showPayment && !subscriptionActive;

    if (showPaymentFlow) {
        return (
            <div className="pb-20">
                <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => setShowPayment(false)}
                        className="serenatas-interactive mb-4 flex items-center gap-2 rounded-lg"
                        style={{ color: 'var(--fg-secondary)' }}
                    >
                        <IconArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                </div>

                <SerenatasPageShell width="narrow">
                    <SerenatasPageHeader
                        title="Confirmar suscripción"
                        description={`Coordinador — $${COORDINATOR_PRICE_CLP.toLocaleString()} CLP / mes`}
                    />

                    <div className="rounded-xl p-6 border mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)' }}
                            >
                                <IconCreditCard size={24} style={{ color: 'var(--info)' }} />
                            </div>
                            <div>
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>MercadoPago</p>
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Pago seguro</p>
                            </div>
                        </div>

                        <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--fg-secondary)' }}>Suscripción</span>
                                <span style={{ color: 'var(--fg)' }}>Coordinador</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <span style={{ color: 'var(--fg)' }}>Total mensual</span>
                                <span style={{ color: 'var(--fg)' }}>
                                    ${COORDINATOR_PRICE_CLP.toLocaleString()} CLP
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        {isLoading ? (
                            <IconLoader className="animate-spin mx-auto" size={24} />
                        ) : (
                            `Pagar con MercadoPago — $${COORDINATOR_PRICE_CLP.toLocaleString()}`
                        )}
                    </button>
                    <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
                        Te llevaremos a MercadoPago para completar el pago de forma segura.
                    </p>
                </SerenatasPageShell>
            </div>
        );
    }

    const statusLabel = subscriptionActive
        ? `Suscripción activa${
              coordinatorProfile?.subscriptionEndsAt
                  ? ` · próxima renovación / vigencia: ${new Date(coordinatorProfile.subscriptionEndsAt).toLocaleDateString('es-CL')}`
                  : ''
          }`
        : coordinatorProfile
          ? `Completa el pago para activar el panel de coordinador (estado: ${coordinatorProfile.subscriptionStatus})`
          : 'Una sola suscripción mensual; al pagar obtienes el rol coordinador y todas las funciones.';

    if (subscriptionActive) {
        return (
            <div className="pb-20">
                <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <SerenatasPageHeader
                        title="Suscripción coordinador"
                        description={statusLabel}
                        className="!mb-0"
                    />
                </div>

                <SerenatasPageShell width="default" className="space-y-4">
                    <div
                        className="rounded-xl p-6 border"
                        style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--success)',
                        }}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'color-mix(in oklab, var(--success) 18%, var(--surface))' }}
                            >
                                <IconCheck size={28} style={{ color: 'var(--success)' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                    Tu suscripción está activa
                                </h3>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                    Tienes acceso completo al panel de coordinador. Comisión en leads de plataforma:{' '}
                                    <strong style={{ color: 'var(--fg)' }}>8% + IVA</strong>.
                                </p>
                                {coordinatorProfile?.subscriptionEndsAt ? (
                                    <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
                                        Vigencia hasta el{' '}
                                        <strong style={{ color: 'var(--fg)' }}>
                                            {new Date(coordinatorProfile.subscriptionEndsAt).toLocaleDateString('es-CL')}
                                        </strong>
                                        .
                                    </p>
                                ) : (
                                    <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
                                        Sin fecha de término registrada (renovación según tu medio de pago).
                                    </p>
                                )}
                            </div>
                        </div>

                        <ul className="space-y-2 mb-6">
                            {COORDINATOR_FEATURES.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={16} style={{ color: 'var(--success)' }} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/inicio"
                            className="inline-flex w-full justify-center py-3 rounded-xl font-medium transition-colors text-center"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </SerenatasPageShell>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <SerenatasPageHeader
                    title="Suscripción coordinador"
                    description={statusLabel}
                    className="!mb-0"
                />
            </div>

            <SerenatasPageShell width="default" className="space-y-4">
                <div
                    className="rounded-xl p-5 border"
                    style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--accent)',
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                            Plan único — Coordinador
                        </h3>
                        <div className="text-right">
                            <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                ${COORDINATOR_PRICE_CLP.toLocaleString()}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/mes</span>
                        </div>
                    </div>

                    <p className="text-sm mb-3" style={{ color: 'var(--fg-secondary)' }}>
                        Acceso completo al panel de coordinación. Tras el pago, tu cuenta pasa a rol coordinador.
                    </p>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>Comisión en leads de plataforma:</span>
                        <span className="font-bold" style={{ color: 'var(--accent)' }}>8% + IVA</span>
                    </div>

                    <ul className="space-y-2 mb-4">
                        {COORDINATOR_FEATURES.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <IconCheck size={16} style={{ color: 'var(--success)' }} />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        onClick={() => setShowPayment(true)}
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl font-medium transition-colors"
                        style={{
                            background: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                        }}
                    >
                        Continuar al pago
                    </button>
                </div>
            </SerenatasPageShell>
        </div>
    );
}
