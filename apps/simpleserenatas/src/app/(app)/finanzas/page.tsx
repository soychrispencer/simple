'use client';

import { useState, useEffect } from 'react';
import { 
    IconArrowLeft,
    IconCurrencyDollar,
    IconTrendingUp,
    IconTrendingDown,
    IconCalendar,
    IconCreditCard,
    IconLoader,
    IconArrowUpRight,
    IconArrowDownRight,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface Transaction {
    id: string;
    type: 'subscription' | 'serenata';
    amount: number;
    captainEarnings?: number;
    platformFee?: number;
    status: string;
    createdAt: string;
    serenataId?: string;
}

interface Finances {
    totalEarnings: number;
    thisMonthEarnings: number;
    totalPlatformFees: number;
    pendingEarnings: number;
    completedSerenatas: number;
    averagePerSerenata: number;
    subscription: {
        plan: string;
        commissionRate: string;
        expiresAt: string;
    };
}

export default function FinanzasPage() {
    const router = useRouter();
    const { captainProfile } = useAuth();
    const [finances, setFinances] = useState<Finances | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

    useEffect(() => {
        fetchFinances();
    }, []);

    const fetchFinances = async () => {
        try {
            const [financesRes, transactionsRes] = await Promise.all([
                fetch(`${API_BASE}/api/serenatas/captains/me/finances`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/serenatas/captains/me/transactions`, { credentials: 'include' }),
            ]);

            if (financesRes.ok) {
                const data = await financesRes.json();
                if (data.ok) setFinances(data.finances);
            }
            if (transactionsRes.ok) {
                const data = await transactionsRes.json();
                if (data.ok) setTransactions(data.transactions);
            }
        } catch (error) {
            console.error('Error fetching finances:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <IconLoader className="animate-spin text-rose-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <button 
                    onClick={() => router.push('/inicio')}
                    className="flex items-center gap-2 text-zinc-600 mb-4"
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <h1 className="text-xl font-bold text-zinc-900">Mis Finanzas</h1>
                <p className="text-sm text-zinc-500">Plan {finances?.subscription.plan.toUpperCase()}</p>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-zinc-100">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'overview'
                                ? 'border-rose-500 text-rose-600'
                                : 'border-transparent text-zinc-500'
                        }`}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'transactions'
                                ? 'border-rose-500 text-rose-600'
                                : 'border-transparent text-zinc-500'
                        }`}
                    >
                        Transacciones
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                    {/* Main Stats */}
                    <div className="bg-rose-500 rounded-2xl p-6 text-white">
                        <p className="text-rose-100 text-sm mb-1">Ganancias totales</p>
                        <p className="text-3xl font-bold">${finances?.totalEarnings.toLocaleString() || 0}</p>
                        <div className="flex items-center gap-2 mt-2 text-rose-100 text-sm">
                            <IconTrendingUp size={16} />
                            <span>Este mes: ${finances?.thisMonthEarnings.toLocaleString() || 0}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <IconCalendar size={16} />
                                <span>Serenatas</span>
                            </div>
                            <p className="text-2xl font-bold text-zinc-900">{finances?.completedSerenatas || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-sm mb-1">
                                <IconCurrencyDollar size={16} />
                                <span>Promedio</span>
                            </div>
                            <p className="text-2xl font-bold text-zinc-900">
                                ${Math.round(finances?.averagePerSerenata || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Commission Info */}
                    <div className="bg-white rounded-xl p-5 shadow-sm">
                        <h3 className="font-semibold text-zinc-900 mb-4">Comisiones</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Tasa actual</span>
                                <span className="font-bold text-rose-600">{finances?.subscription.commissionRate || '20%'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Comisiones pagadas</span>
                                <span className="font-medium text-zinc-900">${finances?.totalPlatformFees.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Pendiente de pago</span>
                                <span className="font-medium text-amber-600">${finances?.pendingEarnings.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Upgrade CTA */}
                    {finances?.subscription.plan === 'free' && (
                        <button
                            onClick={() => router.push('/suscripcion')}
                            className="w-full bg-zinc-900 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                        >
                            <IconTrendingUp size={20} />
                            Reducir comision al 10% con Pro
                        </button>
                    )}
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="divide-y divide-zinc-100">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <IconCreditCard size={48} className="mx-auto text-zinc-300 mb-4" />
                            <p className="text-zinc-500">No hay transacciones aun</p>
                        </div>
                    ) : (
                        transactions.map((t) => (
                            <div key={t.id} className="bg-white p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        t.type === 'subscription' ? 'bg-blue-100' : 'bg-green-100'
                                    }`}>
                                        {t.type === 'subscription' ? (
                                            <IconCreditCard size={20} className="text-blue-600" />
                                        ) : (
                                            <IconCurrencyDollar size={20} className="text-green-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-900">
                                            {t.type === 'subscription' ? 'Suscripcion' : 'Serenata'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {new Date(t.createdAt).toLocaleDateString('es-CL')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${
                                        t.type === 'subscription' ? 'text-zinc-900' : 'text-green-600'
                                    }`}>
                                        {t.type === 'subscription' ? '-' : '+'}${
                                            (t.captainEarnings || t.amount).toLocaleString()
                                        }
                                    </p>
                                    {t.type === 'serenata' && t.platformFee && (
                                        <p className="text-xs text-zinc-400">
                                            -${t.platformFee} comision
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
