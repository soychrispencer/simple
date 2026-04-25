'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    IconCheck,
    IconLoader,
    IconCreditCard,
    IconChevronRight,
    IconArrowLeft,
    IconStar,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

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
        description: 'Para capitanes activos',
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

export default function SuscripcionPage() {
    const router = useRouter();
    const { captainProfile, updateCaptainProfile } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState<string>(captainProfile?.subscriptionPlan || 'free');
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
                    await updateCaptainProfile?.({ subscriptionPlan: planId as any });
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
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/payments/subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    plan: selectedPlan, 
                    paymentMethod: 'mercadopago' 
                }),
            });

            if (res.ok) {
                await updateCaptainProfile?.({ subscriptionPlan: selectedPlan as any });
                router.push('/inicio');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (showPayment) {
        const plan = plans.find(p => p.id === selectedPlan);
        return (
            <div className="min-h-screen bg-zinc-50 pb-20">
                <div className="bg-white px-6 py-4 border-b border-zinc-100">
                    <button 
                        onClick={() => setShowPayment(false)}
                        className="flex items-center gap-2 text-zinc-600"
                    >
                        <IconArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                </div>

                <div className="px-6 py-6">
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">Confirmar suscripcion</h1>
                    <p className="text-zinc-500 mb-6">
                        Plan {plan?.name} - ${plan?.price.toLocaleString()}/mes
                    </p>

                    <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <IconCreditCard className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <p className="font-medium text-zinc-900">MercadoPago</p>
                                <p className="text-sm text-zinc-500">Pago seguro</p>
                            </div>
                        </div>

                        <div className="border-t border-zinc-100 pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="text-zinc-900">${plan?.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Comision</span>
                                <span className="text-zinc-900">${(plan?.price || 0) * 0.03}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t border-zinc-100">
                                <span className="text-zinc-900">Total</span>
                                <span className="text-zinc-900">
                                    ${((plan?.price || 0) * 1.03).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full bg-rose-500 text-white py-4 rounded-xl font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <IconLoader className="animate-spin mx-auto" size={24} />
                        ) : (
                            `Pagar $${((plan?.price || 0) * 1.03).toLocaleString()}`
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <h1 className="text-xl font-bold text-zinc-900">Elige tu plan</h1>
                <p className="text-sm text-zinc-500">Mejora tu plan para ganar mas</p>
            </div>

            <div className="px-6 py-6 space-y-4">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`bg-white rounded-xl p-5 border-2 cursor-pointer transition-all ${
                            selectedPlan === plan.id 
                                ? 'border-rose-500' 
                                : 'border-transparent hover:border-zinc-200'
                        }`}
                    >
                        {plan.popular && (
                            <span className="inline-block bg-rose-500 text-white text-xs px-2 py-1 rounded-full mb-2">
                                Popular
                            </span>
                        )}

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-rose-600">
                                    ${plan.price.toLocaleString()}
                                </span>
                                <span className="text-sm text-zinc-400">/mes</span>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-500 mb-3">{plan.description}</p>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium text-zinc-700">Comision:</span>
                            <span className={`font-bold ${plan.commission === '0%' ? 'text-green-600' : 'text-rose-600'}`}>
                                {plan.commission}
                            </span>
                        </div>

                        <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                                    <IconCheck size={16} className="text-green-500" />
                                    {feature}
                                </li>
                            ))}
                            {plan.notIncluded.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                                    <span className="w-4 text-center">-</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSelectPlan(plan.id)}
                            disabled={isLoading && selectedPlan === plan.id}
                            className={`w-full py-3 rounded-xl font-medium transition-colors ${
                                selectedPlan === plan.id
                                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }`}
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
            </div>
        </div>
    );
}
