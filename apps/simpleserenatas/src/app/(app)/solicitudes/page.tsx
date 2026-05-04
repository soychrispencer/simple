'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconMapPin,
    IconClock,
    IconFlame,
    IconCheck,
    IconX,
    IconMusic,
    IconChevronRight,
    IconCalendar,
    IconLoader,
    IconPlus,
    IconRoute,
} from '@tabler/icons-react';
import { useToast } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import Link from 'next/link';

interface SerenataRequest {
    id: string;
    recipientName: string;
    address: string;
    comuna?: string;
    city?: string;
    eventDate: string;
    eventTime?: string;
    urgency: 'normal' | 'urgent' | 'express';
    price?: number;
    clientName: string;
    distance?: number;
}

export default function SolicitudesPickupPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<SerenataRequest[]>([]);
    const [respondedIds, setRespondedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow'>('all');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE}/api/serenatas/available/for-pickup?limit=50`, { 
                credentials: 'include' 
            });
            const data = await res.json().catch(() => ({}));
            if (data?.ok && Array.isArray(data.requests)) {
                setRequests(data.requests);
            } else {
                setRequests([]);
            }
        } catch {
            showToast('Error al cargar solicitudes', 'error');
            setRequests([]);
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
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
        return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    };

    const handleAccept = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${id}/assign`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                credentials: 'include',
                body: JSON.stringify({})
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setRespondedIds((prev) => [...prev, id]);
                showToast('Serenata asignada', 'success');
                router.push(`/coordinator/tracking/${id}`);
            } else {
                showToast(data?.error || 'Error al asignar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDecline = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/requests/${id}/decline`, { 
                method: 'POST', 
                credentials: 'include' 
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setRespondedIds((prev) => [...prev, id]);
                showToast('Serenata rechazada', 'info');
            } else {
                showToast(data?.error || 'Error al rechazar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const filteredRequests = requests
        .filter((r) => !respondedIds.includes(r.id))
        .filter((r) => {
            if (filter === 'all') return true;
            const date = new Date(r.eventDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (filter === 'today') return date.toDateString() === today.toDateString();
            if (filter === 'tomorrow') return date.toDateString() === tomorrow.toDateString();
            return true;
        });

    const todayCount = requests.filter((r) => {
        const date = new Date(r.eventDate);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }).length;

    const tomorrowCount = requests.filter((r) => {
        const date = new Date(r.eventDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.toDateString() === tomorrow.toDateString();
    }).length;

    if (isLoading) {
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
                title="Solicitudes Disponibles" 
                description={`${filteredRequests.length} serenatas para pickup · ${todayCount} hoy · ${tomorrowCount} mañana`} 
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard value={todayCount} label="Hoy" icon={IconCalendar} color="#ef4444" />
                <StatCard value={tomorrowCount} label="Mañana" icon={IconCalendar} color="#3b82f6" />
                <StatCard value={requests.length} label="Total" icon={IconMusic} color="#10b981" />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
                <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
                    Todas
                </FilterTab>
                <FilterTab active={filter === 'today'} onClick={() => setFilter('today')} count={todayCount}>
                    Hoy
                </FilterTab>
                <FilterTab active={filter === 'tomorrow'} onClick={() => setFilter('tomorrow')} count={tomorrowCount}>
                    Mañana
                </FilterTab>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                    <IconMusic size={48} className="mx-auto mb-4" style={{ color: 'var(--border-strong)' }} />
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>
                        No hay solicitudes disponibles
                    </p>
                    <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                        Las nuevas solicitudes aparecerán aquí cuando los clientes las creen
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link href="/inicio">
                            <button 
                                className="px-4 py-2.5 rounded-xl font-medium"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                            >
                                Volver al inicio
                            </button>
                        </Link>
                        <Link href="/mapa">
                            <button 
                                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2"
                                style={{ background: 'var(--accent)', color: 'white' }}
                            >
                                <IconRoute size={18} />
                                Ver rutas
                            </button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((request) => (
                        <div 
                            key={request.id}
                            className="p-4 rounded-2xl"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span 
                                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{ 
                                                background: request.urgency === 'urgent' ? '#fee2e2' : request.urgency === 'express' ? '#fef3c7' : '#d1fae5',
                                                color: request.urgency === 'urgent' ? '#ef4444' : request.urgency === 'express' ? '#f59e0b' : '#10b981'
                                            }}
                                        >
                                            {request.urgency === 'urgent' ? 'Urgente' : request.urgency === 'express' ? 'Express' : 'Normal'}
                                        </span>
                                        {request.distance && (
                                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {Math.round(request.distance)} km
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-lg" style={{ color: 'var(--fg)' }}>
                                        {request.recipientName || 'Serenata'}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        Cliente: {request.clientName}
                                    </p>
                                </div>
                                {request.price && (
                                    <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                                        {formatCurrency(request.price)}
                                    </span>
                                )}
                            </div>
                            
                            <div className="space-y-1.5 mb-4">
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconClock size={14} />
                                    <span>{request.eventTime || 'Hora por confirmar'} · {formatDate(request.eventDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconMapPin size={14} />
                                    <span className="truncate">{request.comuna || request.city || request.address}</span>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleAccept(request.id)}
                                    className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                                    style={{ background: 'var(--accent)', color: 'white' }}
                                >
                                    <IconCheck size={18} />
                                    Tomar serenata
                                </button>
                                <button 
                                    onClick={() => handleDecline(request.id)}
                                    className="px-4 py-3 rounded-xl font-medium"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                                >
                                    <IconX size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating CTA */}
            <Link href="/grupos" className="fixed bottom-20 left-4 right-4 md:hidden">
                <button 
                    className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
                    style={{ background: 'var(--accent)', color: 'white' }}
                >
                    <IconPlus size={20} />
                    Crear grupo
                </button>
            </Link>
        </SerenatasPageShell>
    );
}

function StatCard({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) {
    return (
        <div 
            className="p-3 rounded-xl text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
            <div 
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ background: `${color}20` }}
            >
                <Icon size={20} style={{ color }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</div>
        </div>
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
    count?: number;
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
            {count !== undefined && count > 0 && (
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
