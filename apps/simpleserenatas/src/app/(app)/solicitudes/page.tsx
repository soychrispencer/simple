'use client';

import { useState, useEffect } from 'react';
import { 
    IconMapPin, 
    IconClock, 
    IconFlame,
    IconCheck,
    IconX,
    IconInfoCircle,
    IconFilter,
    IconSearch,
    IconArrowRight,
    IconConfetti,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';

interface Solicitud {
    id: string;
    clientName: string;
    address: string;
    comuna: string;
    dateTime: string;
    urgency: string;
    price: string;
    requiredInstruments: string[];
    message: string;
    distance: number;
}

export default function SolicitudesPage() {
    const { showToast } = useToast();
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [respondedIds, setRespondedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'urgent' | 'normal'>('all');

    useEffect(() => {
        const loadSolicitudes = async () => {
            try {
                const [urgentRes, availableRes] = await Promise.all([
                    fetch(`${API_BASE}/api/serenatas/requests/urgent/list?limit=10`, {
                        credentials: 'include',
                    }),
                    fetch(`${API_BASE}/api/serenatas/requests/available/for-musician`, {
                        credentials: 'include',
                    }),
                ]);

                const urgentData = await urgentRes.json();
                const availableData = await availableRes.json();

                const allSolicitudes: Solicitud[] = [];
                
                if (urgentData.ok && urgentData.requests) {
                    allSolicitudes.push(...urgentData.requests.map((r: any) => ({ ...r, urgency: 'urgent' })));
                }
                
                if (availableData.ok && availableData.requests) {
                    allSolicitudes.push(...availableData.requests.map((r: any) => ({ ...r, urgency: 'normal' })));
                }
                
                setSolicitudes(allSolicitudes);
                if (allSolicitudes.length > 0 && !selectedId) {
                    setSelectedId(allSolicitudes[0].id);
                }
            } catch {
                showToast('Error al cargar solicitudes', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadSolicitudes();
    }, [showToast]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        return {
            date: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            diffHours,
            isToday: date.toDateString() === now.toDateString(),
        };
    };

    const handleAccept = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/requests/${id}/accept`, {
                method: 'POST',
                credentials: 'include',
            });
            
            const data = await res.json();
            if (data.ok) {
                setRespondedIds([...respondedIds, id]);
                showToast('Solicitud aceptada', 'success');
            } else {
                showToast(data.error || 'Error al aceptar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const handleDecline = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/requests/${id}/decline`, {
                method: 'POST',
                credentials: 'include',
            });
            
            const data = await res.json();
            if (data.ok) {
                setRespondedIds([...respondedIds, id]);
                showToast('Solicitud rechazada', 'info');
            } else {
                showToast(data.error || 'Error al rechazar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    const filteredSolicitudes = solicitudes.filter(s => {
        if (filter === 'urgent') return s.urgency === 'urgent';
        if (filter === 'normal') return s.urgency === 'normal';
        return true;
    }).filter(s => !respondedIds.includes(s.id));

    const urgentCount = solicitudes.filter(s => s.urgency === 'urgent' && !respondedIds.includes(s.id)).length;
    const normalCount = solicitudes.filter(s => s.urgency === 'normal' && !respondedIds.includes(s.id)).length;

    const selectedSolicitud = solicitudes.find(s => s.id === selectedId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 h-[calc(100vh-4rem)] md:h-auto">
            {/* Mobile View - Stack Layout */}
            <div className="md:hidden space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Solicitudes</h1>
                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {filteredSolicitudes.length} disponibles
                    </span>
                </div>

                {/* Info Banner */}
                <div 
                    className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: 'color-mix(in oklab, var(--info) 10%, transparent)' }}
                >
                    <IconInfoCircle size={20} style={{ color: 'var(--info)' }} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm" style={{ color: 'var(--info)' }}>
                        Acepta las solicitudes que puedas cumplir
                    </p>
                </div>

                {/* Request List */}
                {filteredSolicitudes.length === 0 ? (
                    <div className="card text-center py-12">
                        <IconClock size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                        <p style={{ color: 'var(--fg-muted)' }}>No hay solicitudes disponibles</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSolicitudes.map((item) => (
                            <SolicitudCard 
                                key={item.id} 
                                item={item} 
                                onAccept={() => handleAccept(item.id)}
                                onDecline={() => handleDecline(item.id)}
                                formatDateTime={formatDateTime}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Desktop View - Split Layout */}
            <div className="hidden md:grid md:grid-cols-12 gap-6 h-full">
                {/* Left Sidebar - Request List */}
                <div className="col-span-5 lg:col-span-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Solicitudes</h1>
                        <div className="flex items-center gap-2">
                            <button 
                                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconFilter size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-4">
                        <FilterTab 
                            active={filter === 'all'} 
                            onClick={() => setFilter('all')}
                            count={urgentCount + normalCount}
                        >
                            Todas
                        </FilterTab>
                        <FilterTab 
                            active={filter === 'urgent'} 
                            onClick={() => setFilter('urgent')}
                            count={urgentCount}
                            urgent
                        >
                            Urgentes
                        </FilterTab>
                        <FilterTab 
                            active={filter === 'normal'} 
                            onClick={() => setFilter('normal')}
                            count={normalCount}
                        >
                            Normal
                        </FilterTab>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin -mx-2 px-2">
                        {filteredSolicitudes.length === 0 ? (
                            <div className="card text-center py-12">
                                <IconSearch size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                                <p style={{ color: 'var(--fg-muted)' }}>No hay solicitudes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredSolicitudes.map((item) => {
                                    const { time, date } = formatDateTime(item.dateTime);
                                    const isSelected = selectedId === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedId(item.id)}
                                            className={`w-full text-left card transition-all ${
                                                isSelected ? 'ring-2' : ''
                                            }`}
                                            style={{ 
                                                borderColor: isSelected ? 'var(--accent-border)' : undefined,
                                                background: isSelected ? 'var(--accent-soft)' : undefined
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {item.urgency === 'urgent' && (
                                                            <span 
                                                                className="text-xs font-bold px-1.5 py-0.5 rounded"
                                                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                                            >
                                                                URGENTE
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                                            {item.clientName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                        <IconClock size={14} />
                                                        <span>{time} · {date}</span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                                                    {formatCurrency(parseInt(item.price || '0'))}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Detail View */}
                <div className="col-span-7 lg:col-span-8">
                    {selectedSolicitud ? (
                        <SolicitudDetail 
                            item={selectedSolicitud}
                            onAccept={() => handleAccept(selectedSolicitud.id)}
                            onDecline={() => handleDecline(selectedSolicitud.id)}
                            formatDateTime={formatDateTime}
                            formatCurrency={formatCurrency}
                        />
                    ) : (
                        <div className="card h-full flex flex-col items-center justify-center">
                            <IconConfetti size={64} style={{ color: 'var(--border-strong)' }} className="mb-4" />
                            <p style={{ color: 'var(--fg-muted)' }}>Selecciona una solicitud para ver los detalles</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Mobile Card Component
function SolicitudCard({ 
    item, 
    onAccept, 
    onDecline, 
    formatDateTime, 
    formatCurrency 
}: { 
    item: Solicitud;
    onAccept: () => void;
    onDecline: () => void;
    formatDateTime: (d: string) => any;
    formatCurrency: (n: number) => string;
}) {
    const { date, time, isToday } = formatDateTime(item.dateTime);
    const isUrgent = item.urgency === 'urgent';

    return (
        <div 
            className="card"
            style={isUrgent ? { 
                background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                borderColor: 'var(--accent-border)'
            } : {}}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {isUrgent && (
                            <span 
                                className="text-xs font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                            >
                                URGENTE
                            </span>
                        )}
                        {isToday && (
                            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                                ¡Es hoy!
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>{item.clientName}</h3>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{time} · {date}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                    {formatCurrency(parseInt(item.price || '0'))}
                </span>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconMapPin size={16} />
                    <span>{item.address}</span>
                    <span style={{ color: 'var(--accent)' }} className="font-medium">{item.distance} km</span>
                </div>
                {item.message && (
                    <p className="text-sm italic" style={{ color: 'var(--fg-secondary)' }}>"{item.message}"</p>
                )}
                {item.requiredInstruments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {item.requiredInstruments.map((inst) => (
                            <span 
                                key={inst}
                                className="text-xs px-2 py-1 rounded border"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                {inst}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onAccept}
                    className="flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconCheck size={18} />
                    Aceptar
                </button>
                <button
                    onClick={onDecline}
                    className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                >
                    Rechazar
                </button>
            </div>
        </div>
    );
}

// Desktop Detail Panel Component
function SolicitudDetail({ 
    item, 
    onAccept, 
    onDecline, 
    formatDateTime, 
    formatCurrency 
}: { 
    item: Solicitud;
    onAccept: () => void;
    onDecline: () => void;
    formatDateTime: (d: string) => any;
    formatCurrency: (n: number) => string;
}) {
    const { date, time, isToday, diffHours } = formatDateTime(item.dateTime);
    const isUrgent = item.urgency === 'urgent';

    return (
        <div className="card h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {isUrgent && (
                            <span 
                                className="text-xs font-bold px-2 py-1 rounded"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                            >
                                <IconFlame size={12} className="inline mr-1" />
                                URGENTE
                            </span>
                        )}
                        {isToday && (
                            <span 
                                className="text-xs font-bold px-2 py-1 rounded"
                                style={{ background: 'color-mix(in oklab, var(--accent) 20%, transparent)', color: 'var(--accent)' }}
                            >
                                ¡ES HOY!
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{item.clientName}</h2>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(parseInt(item.price || '0'))}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Por serenata</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div 
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-subtle)' }}
                >
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--fg-muted)' }}>
                        <IconClock size={18} />
                        <span className="text-sm">Fecha y hora</span>
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{date} a las {time}</p>
                    {!isToday && diffHours > 0 && (
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            En {Math.floor(diffHours / 24)} días
                        </p>
                    )}
                </div>
                <div 
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-subtle)' }}
                >
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--fg-muted)' }}>
                        <IconMapPin size={18} />
                        <span className="text-sm">Ubicación</span>
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{item.comuna || 'No especificada'}</p>
                    <p className="text-sm" style={{ color: 'var(--accent)' }}>{item.distance} km de distancia</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--fg)' }}>Dirección</h3>
                <p style={{ color: 'var(--fg-secondary)' }}>{item.address}</p>
            </div>

            {item.requiredInstruments.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--fg)' }}>Instrumentos requeridos</h3>
                    <div className="flex flex-wrap gap-2">
                        {item.requiredInstruments.map((inst) => (
                            <span 
                                key={inst}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                            >
                                {inst}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {item.message && (
                <div className="mb-6">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--fg)' }}>Mensaje del cliente</h3>
                    <div 
                        className="p-4 rounded-xl"
                        style={{ background: 'var(--bg-subtle)' }}
                    >
                        <p className="italic" style={{ color: 'var(--fg-secondary)' }}>"{item.message}"</p>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                    onClick={onAccept}
                    className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconCheck size={20} />
                    Aceptar Solicitud
                </button>
                <button
                    onClick={onDecline}
                    className="px-6 py-3 rounded-xl font-medium transition-colors"
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                >
                    <IconX size={20} className="inline mr-1" />
                    Rechazar
                </button>
            </div>
        </div>
    );
}

// Filter Tab Component
function FilterTab({ 
    children, 
    active, 
    onClick, 
    count,
    urgent 
}: { 
    children: React.ReactNode; 
    active: boolean; 
    onClick: () => void;
    count: number;
    urgent?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={active ? {
                background: urgent ? 'var(--accent)' : 'var(--accent-subtle)',
                color: urgent ? 'var(--accent-contrast)' : 'var(--accent)',
            } : {
                background: 'var(--bg-subtle)',
                color: 'var(--fg-muted)',
            }}
        >
            {children}
            {count > 0 && (
                <span 
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ 
                        background: active ? 'rgba(255,255,255,0.3)' : 'var(--border)',
                    }}
                >
                    {count}
                </span>
            )}
        </button>
    );
}
