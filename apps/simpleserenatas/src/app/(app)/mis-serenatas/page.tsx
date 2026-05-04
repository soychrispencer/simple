'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    IconMapPin,
    IconClock,
    IconCalendar,
    IconLoader,
    IconChevronRight,
    IconFlame,
    IconMusic,
    IconCheck,
    IconHourglass,
    IconX,
} from '@tabler/icons-react';
import { useToast } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Serenata {
    id: string;
    recipientName: string;
    address: string;
    comuna?: string;
    eventDate: string;
    eventTime?: string;
    status: 'pending' | 'quoted' | 'accepted' | 'payment_pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    price?: number;
    coordinatorName?: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pending: { label: 'Buscando coordinador', icon: IconHourglass, color: '#f59e0b', bg: '#fef3c7' },
    quoted: { label: 'Cotización recibida', icon: IconMusic, color: '#3b82f6', bg: '#dbeafe' },
    accepted: { label: 'Aceptada', icon: IconCheck, color: '#10b981', bg: '#d1fae5' },
    payment_pending: { label: 'Pago pendiente', icon: IconHourglass, color: '#f59e0b', bg: '#fef3c7' },
    confirmed: { label: 'Confirmada', icon: IconCheck, color: '#10b981', bg: '#d1fae5' },
    in_progress: { label: 'En camino', icon: IconFlame, color: '#ef4444', bg: '#fee2e2' },
    completed: { label: 'Completada', icon: IconCheck, color: '#6b7280', bg: '#f3f4f6' },
    cancelled: { label: 'Cancelada', icon: IconX, color: '#6b7280', bg: '#f3f4f6' },
};

export default function MisSerenatasPage() {
    const { showToast } = useToast();
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

    useEffect(() => {
        loadSerenatas();
    }, []);

    const loadSerenatas = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/api/serenatas/requests`, { credentials: 'include' });
            const data = await res.json().catch(() => ({}));
            if (data?.ok && Array.isArray(data.serenatas)) {
                setSerenatas(data.serenatas);
            } else {
                setSerenatas([]);
            }
        } catch {
            showToast('Error al cargar tus serenatas', 'error');
            setSerenatas([]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount?: number) => {
        if (!amount) return '';
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    };

    const isActive = (status: string) => ['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed', 'in_progress'].includes(status);

    const filteredSerenatas = serenatas.filter((s) => {
        if (filter === 'active') return isActive(s.status);
        if (filter === 'completed') return ['completed', 'cancelled'].includes(s.status);
        return true;
    });

    const activeCount = serenatas.filter((s) => isActive(s.status)).length;
    const completedCount = serenatas.filter((s) => ['completed', 'cancelled'].includes(s.status)).length;

    if (isLoading || isAuthLoading) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <SerenatasPageShell fullWidth>
            <SerenatasPageHeader 
                title="Mis Serenatas" 
                description={`${activeCount} activas · ${completedCount} completadas`} 
            />

            {/* Filtros */}
            <div className="flex gap-2 mb-4">
                <FilterTab active={filter === 'active'} onClick={() => setFilter('active')} count={activeCount}>
                    Activas
                </FilterTab>
                <FilterTab active={filter === 'completed'} onClick={() => setFilter('completed')} count={completedCount}>
                    Historial
                </FilterTab>
                <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} count={serenatas.length}>
                    Todas
                </FilterTab>
            </div>

            {filteredSerenatas.length === 0 ? (
                <div className="text-center py-12">
                    <IconCalendar size={48} className="mx-auto mb-4" style={{ color: 'var(--border-strong)' }} />
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>
                        {filter === 'active' ? 'No tienes serenatas activas' : 'No hay serenatas en el historial'}
                    </p>
                    <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                        Sorprende a alguien especial con una serenata inolvidable
                    </p>
                    <Link href="/solicitar">
                        <button 
                            className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
                            style={{ background: 'var(--accent)', color: 'white' }}
                        >
                            <IconFlame size={20} />
                            Solicitar serenata
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredSerenatas.map((serenata) => {
                        const status = statusConfig[serenata.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        
                        return (
                            <Link key={serenata.id} href={`/tracking/${serenata.id}`} className="block">
                                <div 
                                    className="p-4 rounded-2xl transition-all hover:scale-[1.01]"
                                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                                style={{ background: status.bg }}
                                            >
                                                <StatusIcon size={18} style={{ color: status.color }} />
                                            </div>
                                            <div>
                                                <div 
                                                    className="text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1"
                                                    style={{ background: status.bg, color: status.color }}
                                                >
                                                    {status.label}
                                                </div>
                                                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                                                    {serenata.recipientName || 'Serenata'}
                                                </h3>
                                            </div>
                                        </div>
                                        {serenata.price && (
                                            <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                                                {formatCurrency(serenata.price)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            <IconClock size={14} />
                                            <span>{serenata.eventTime || 'Hora por confirmar'} · {formatDate(serenata.eventDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            <IconMapPin size={14} />
                                            <span className="truncate">{serenata.comuna || serenata.address || 'Ubicación por confirmar'}</span>
                                        </div>
                                    </div>
                                    
                                    <div 
                                        className="w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"
                                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                                    >
                                        Ver seguimiento
                                        <IconChevronRight size={16} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Floating CTA for active serenatas */}
            {activeCount > 0 && (
                <Link href="/solicitar" className="fixed bottom-20 left-4 right-4 md:hidden">
                    <button 
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
                        style={{ background: 'var(--accent)', color: 'white' }}
                    >
                        <IconFlame size={20} />
                        Nueva serenata
                    </button>
                </Link>
            )}
        </SerenatasPageShell>
    );
}

function FilterTab({ 
    children, 
    active, 
    onClick, 
    count 
}: { 
    children: React.ReactNode; 
    active: boolean; 
    onClick: () => void; 
    count: number;
}) {
    return (
        <button 
            onClick={onClick} 
            className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={active ? 
                { background: 'var(--accent-subtle)', color: 'var(--accent)' } : 
                { background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }
            }
        >
            {children}
            {count > 0 && (
                <span 
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ 
                        background: active ? 'var(--accent)' : 'var(--border)', 
                        color: active ? 'white' : 'var(--fg-muted)' 
                    }}
                >
                    {count}
                </span>
            )}
        </button>
    );
}
