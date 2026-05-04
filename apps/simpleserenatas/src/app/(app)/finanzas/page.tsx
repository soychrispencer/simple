'use client';

import { useState, useEffect } from 'react';
import { 
    IconArrowLeft,
    IconCurrencyDollar,
    IconTrendingUp,
    IconCalendar,
    IconCreditCard,
    IconLoader,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Transaction {
    id: string;
    /** Presente cuando el backend distingue tipo; si no, se infiere por serenataId */
    type?: 'subscription' | 'serenata';
    /** Campo histórico / compat */
    amount?: number;
    totalAmount?: number;
    coordinatorEarnings?: number;
    platformCommission?: number;
    commissionVat?: number;
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
        /** UI legacy */
        commissionRate?: string;
        /** Respuesta actual del API de finanzas */
        platformLeadCommission?: string;
        expiresAt: string | null;
    };
}

export default function FinanzasPage() {
    const router = useRouter();
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
                fetch(`${API_BASE}/api/serenatas/coordinators/me/finances`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/serenatas/coordinators/me/transactions`, { credentials: 'include' }),
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
            <div className="flex min-h-[50vh] items-center justify-center">
                <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button 
                    type="button"
                    onClick={() => router.push('/inicio')}
                    className="flex items-center gap-2 mb-4 serenatas-interactive rounded-lg"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <SerenatasPageHeader
                    title="Mis finanzas"
                    description={`Plan ${finances?.subscription.plan?.toUpperCase() ?? '—'}`}
                    className="!mb-0"
                />
            </div>

            {/* Tabs */}
            <div className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
                        style={{
                            borderColor: activeTab === 'overview' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--fg-secondary)',
                        }}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className="flex-1 py-3 text-sm font-medium border-b-2 transition-colors"
                        style={{
                            borderColor: activeTab === 'transactions' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'transactions' ? 'var(--accent)' : 'var(--fg-secondary)',
                        }}
                    >
                        Transacciones
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <SerenatasPageShell width="default" className="space-y-6">
                    {/* Main Stats */}
                    <div className="rounded-2xl p-6" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                        <p className="text-sm mb-1" style={{ color: 'color-mix(in oklab, var(--accent-contrast) 75%, transparent)' }}>Ganancias totales</p>
                        <p className="text-3xl font-bold">${finances?.totalEarnings.toLocaleString() || 0}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'color-mix(in oklab, var(--accent-contrast) 75%, transparent)' }}>
                            <IconTrendingUp size={16} />
                            <span>Este mes: ${finances?.thisMonthEarnings.toLocaleString() || 0}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--fg-secondary)' }}>
                                <IconCalendar size={16} />
                                <span>Serenatas</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{finances?.completedSerenatas || 0}</p>
                        </div>
                        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--fg-secondary)' }}>
                                <IconCurrencyDollar size={16} />
                                <span>Promedio</span>
                            </div>
                            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                ${Math.round(finances?.averagePerSerenata || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Commission Info */}
                    <div className="rounded-xl p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Comisiones</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--fg-secondary)' }}>Tasa actual</span>
                                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                                    {finances?.subscription.commissionRate
                                        ?? finances?.subscription.platformLeadCommission
                                        ?? '20%'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--fg-secondary)' }}>Comisiones pagadas</span>
                                <span className="font-medium" style={{ color: 'var(--fg)' }}>${finances?.totalPlatformFees.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--fg-secondary)' }}>Pendiente de pago</span>
                                <span className="font-medium" style={{ color: 'var(--warning)' }}>${finances?.pendingEarnings.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Upgrade CTA */}
                    {finances?.subscription.plan === 'free' && (
                        <button
                            onClick={() => router.push('/suscripcion')}
                            className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                        >
                            <IconTrendingUp size={20} />
                            Reducir comisión al 10% con Pro
                        </button>
                    )}
                </SerenatasPageShell>
            )}

            {activeTab === 'transactions' && (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <IconCreditCard size={48} className="mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
                            <p style={{ color: 'var(--fg-secondary)' }}>No hay transacciones aun</p>
                        </div>
                    ) : (
                        transactions.map((t) => {
                            const kind =
                                t.type
                                ?? (t.serenataId ? 'serenata' : 'subscription');
                            const net =
                                t.coordinatorEarnings
                                ?? t.totalAmount
                                ?? t.amount
                                ?? 0;
                            const fee = t.platformCommission ?? t.platformFee ?? 0;
                            return (
                            <div key={t.id} className="p-4 flex items-center justify-between" style={{ background: 'var(--surface)' }}>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{
                                            background:
                                                kind === 'subscription'
                                                    ? 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)'
                                                    : 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
                                        }}
                                    >
                                        {kind === 'subscription' ? (
                                            <IconCreditCard size={20} style={{ color: 'var(--info)' }} />
                                        ) : (
                                            <IconCurrencyDollar size={20} style={{ color: 'var(--success)' }} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                            {kind === 'subscription' ? 'Suscripcion' : 'Serenata'}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                            {new Date(t.createdAt).toLocaleDateString('es-CL')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold" style={{ color: kind === 'subscription' ? 'var(--fg)' : 'var(--success)' }}>
                                        {kind === 'subscription' ? '-' : '+'}${
                                            net.toLocaleString()
                                        }
                                    </p>
                                    {kind === 'serenata' && !!fee && (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            -${fee} comisión
                                        </p>
                                    )}
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
