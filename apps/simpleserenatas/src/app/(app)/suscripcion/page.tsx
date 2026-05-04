'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const plans = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Para empezar',
        commission: '20%',
        features: [
            'Hasta 5 serenatas/mes',
            'Gestion basica',
            'Soporte por email',
        ],
        notIncluded: [
            'Estadisticas avanzadas',
            'Marketing incluido',
            'Soporte prioritario',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 3900,
        description: 'Para coordinadores activos',
        commission: '10%',
        popular: true,
        features: [
            'Serenatas ilimitadas',
            'Estadisticas avanzadas',
            'Marketing basico',
            'Soporte prioritario',
        ],
        notIncluded: [
            'Marketing avanzado',
            'API access',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 7900,
        description: 'Para negocios serios',
        commission: '0%',
        features: [
            'Todo lo de Pro',
            'Marketing avanzado',
            'Soporte 24/7',
            'API access',
            '0% comision',
        ],
        notIncluded: [],
    },
];

const PENDING_KEY = 'serenatas:subscription:pendingPaymentId';

export default function SuscripcionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { coordinatorProfile, updateCoordinatorProfile } = useAuth();
    const { showToast } = useToast();
    const [selectedPlan, setSelectedPlan] = useState<string>(coordinatorProfile?.subscriptionPlan || 'free');
    const [isLoading, setIsLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);

    const handleSelectPlan = async (planId: string) => {
        if (planId === 'free') {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/payments/subscription`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ plan: planId, paymentMethod: 'none' }),
                });

                if (res.ok) {
                    await updateCoordinatorProfile?.({ subscriptionPlan: planId as 'free' | 'pro' | 'premium' });
                    router.push('/inicio');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setSelectedPlan(planId);
            setShowPayment(true);
        }
    };

    const handlePayment = async () => {
        if (selectedPlan !== 'pro' && selectedPlan !== 'premium') return;
        setIsLoading(true);
        try {
            const checkoutRes = await fetch(
                `${API_BASE}/api/serenatas/payments/subscription/checkout`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ plan: selectedPlan }),
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
                    body: JSON.stringify({ plan: selectedPlan, paymentMethod: 'mercadopago' }),
                });
                const fallback = await fallbackRes.json().catch(() => ({}));
                if (fallbackRes.ok && fallback?.ok) {
                    showToast('Suscripción activada (modo desarrollo).', 'success');
                    await updateCoordinatorProfile?.({
                        subscriptionPlan: selectedPlan as 'pro' | 'premium',
                    });
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
                        const sub = data.subscription as { plan?: 'pro' | 'premium' } | null;
                        if (sub?.plan) {
                            await updateCoordinatorProfile?.({ subscriptionPlan: sub.plan });
                        }
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
        [router, showToast, updateCoordinatorProfile]
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

    if (showPayment) {
        const plan = plans.find(p => p.id === selectedPlan);
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
                        description={`Plan ${plan?.name} — $${plan?.price.toLocaleString()}/mes`}
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
                                <span style={{ color: 'var(--fg-secondary)' }}>Plan</span>
                                <span style={{ color: 'var(--fg)' }}>{plan?.name}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <span style={{ color: 'var(--fg)' }}>Total mensual</span>
                                <span style={{ color: 'var(--fg)' }}>
                                    ${(plan?.price || 0).toLocaleString()} CLP
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
                            `Pagar con MercadoPago — $${(plan?.price || 0).toLocaleString()}`
                        )}
                    </button>
                    <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
                        Te llevaremos a MercadoPago para completar el pago de forma segura.
                    </p>
                </SerenatasPageShell>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <SerenatasPageHeader
                    title="Elige tu plan"
                    description="Mejora tu plan para ganar más"
                    className="!mb-0"
                />
            </div>

            <SerenatasPageShell width="default" className="space-y-4">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className="rounded-xl p-5 border cursor-pointer transition-all"
                        style={{
                            background: 'var(--surface)',
                            borderColor: selectedPlan === plan.id ? 'var(--accent)' : 'var(--border)',
                        }}
                    >
                        {plan.popular && (
                            <span
                                className="inline-block text-xs px-2 py-1 rounded-full mb-2"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                            >
                                Popular
                            </span>
                        )}

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{plan.name}</h3>
                            <div className="text-right">
                                <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                    ${plan.price.toLocaleString()}
                                </span>
                                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>/mes</span>
                            </div>
                        </div>

                        <p className="text-sm mb-3" style={{ color: 'var(--fg-secondary)' }}>{plan.description}</p>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>Comision:</span>
                            <span className="font-bold" style={{ color: plan.commission === '0%' ? 'var(--success)' : 'var(--accent)' }}>
                                {plan.commission}
                            </span>
                        </div>

                        <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <IconCheck size={16} style={{ color: 'var(--success)' }} />
                                    {feature}
                                </li>
                            ))}
                            {plan.notIncluded.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <span className="w-4 text-center">-</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={isLoading && selectedPlan === plan.id}
                            className="w-full py-3 rounded-xl font-medium transition-colors"
                            style={{
                                background: selectedPlan === plan.id ? 'var(--accent)' : 'var(--bg-subtle)',
                                color: selectedPlan === plan.id ? 'var(--accent-contrast)' : 'var(--fg-secondary)',
                            }}
                        >
                            {isLoading && selectedPlan === plan.id ? (
                                <IconLoader className="animate-spin mx-auto" size={20} />
                            ) : plan.price === 0 ? (
                                'Gratis'
                            ) : (
                                'Seleccionar'
                            )}
                        </button>
                    </div>
                ))}
            </SerenatasPageShell>
        </div>
    );
}
