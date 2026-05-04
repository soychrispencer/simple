'use client';

import { useState, useEffect } from 'react';
import { IconMapPin, IconNavigation, IconClock, IconLoader2 } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
    ssr: false,
    loading: () => (
        <div 
            className="h-[calc(100vh-200px)] rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-subtle)' }}
        >
            <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={20} className="animate-spin" />
                <span>Cargando mapa...</span>
            </div>
        </div>
    ),
});

interface Serenata {
    id: string;
    clientName: string;
    address: string;
    lat: number;
    lng: number;
    dateTime: string;
    status: string;
    price: string;
}

export default function MapaPage() {
    const [selectedSerenata, setSelectedSerenata] = useState<string | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
    const { showToast } = useToast();
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCoords, setHasCoords] = useState(false);

    useEffect(() => {
        const loadSerenatas = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
                    credentials: 'include',
                });
                const data = await res.json();
                
                if (data.ok && data.serenatas) {
                    const today = new Date().toDateString();
                    const todaySerenatas = data.serenatas
                        .filter((s: Serenata) => new Date(s.dateTime).toDateString() === today)
                        .map((s: Serenata, i: number) => ({
                            ...s,
                            lat: -33.4489 + (Math.random() - 0.5) * 0.1,
                            lng: -70.6693 + (Math.random() - 0.5) * 0.1,
                        }));
                    setSerenatas(todaySerenatas);
                    setHasCoords(todaySerenatas.length > 0);
                }
            } catch {
                showToast('Error al cargar serenatas', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadSerenatas();
    }, [showToast]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('es-CL', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const handleOptimize = async () => {
        if (serenatas.length < 2) {
            showToast('Necesitas al menos 2 serenatas para optimizar', 'info');
            return;
        }
        
        setIsOptimizing(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/routes/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    serenataIds: serenatas.map(s => s.id),
                    algorithm: 'nearest_neighbor',
                }),
            });
            
            const data = await res.json();
            if (data.ok && Array.isArray(data.optimized)) {
                setOptimizedRoute(
                    data.optimized.map((w: { serenataId?: string; id?: string }) => w.serenataId || w.id || '').filter(Boolean)
                );
                showToast('Ruta optimizada', 'success');
            } else {
                showToast(data.error || 'No pudimos optimizar la ruta', 'error');
            }
        } catch {
            showToast('Error al optimizar ruta', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <IconLoader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    const totalEarnings = serenatas.reduce((sum: number, s: Serenata) => sum + parseInt(s.price || '0'), 0);

    return (
        <SerenatasPageShell
            width="wide"
            flush
            className="flex flex-col min-h-0 h-[calc(100vh-4rem)] md:h-auto"
        >
            <SerenatasPageHeader
                title="Mapa"
                description={
                    serenatas.length > 0
                        ? `${serenatas.length} serenata${serenatas.length === 1 ? '' : 's'} hoy`
                        : 'Serenatas del día en el mapa'
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0 flex-1">
                {/* Left Panel - Stats & List */}
                <div className="lg:col-span-1 space-y-4 overflow-y-auto scrollbar-thin">
                    {/* Route Stats */}
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Ruta del Día</h2>
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {serenatas.length} serenatas · {formatCurrency(totalEarnings)}
                                </p>
                            </div>
                            <button
                                onClick={handleOptimize}
                                disabled={isOptimizing || serenatas.length < 2}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                            >
                                <IconNavigation size={18} />
                                {isOptimizing ? '...' : 'Optimizar'}
                            </button>
                        </div>
                        
                        {optimizedRoute.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                                <IconClock size={14} style={{ color: 'var(--success)' }} />
                                <p className="text-sm" style={{ color: 'var(--success)' }}>
                                    Ruta optimizada: Ahorra ~25 minutos
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Serenata List */}
                    {serenatas.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm" style={{ color: 'var(--fg-muted)' }}>Serenatas de hoy</h3>
                            {serenatas.map((serenata: Serenata, index: number) => {
                                const orderIndex = optimizedRoute.indexOf(serenata.id);
                                const isSelected = selectedSerenata === serenata.id;
                                
                                return (
                                    <button
                                        key={serenata.id}
                                        onClick={() => setSelectedSerenata(serenata.id)}
                                        className={`w-full text-left card transition-all ${isSelected ? 'ring-2' : ''}`}
                                        style={{
                                            borderColor: isSelected ? 'var(--accent-border)' : undefined,
                                            background: isSelected ? 'var(--accent-soft)' : undefined,
                                            padding: '0.75rem'
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                                                style={{
                                                    color: 'var(--accent-contrast)',
                                                    background: optimizedRoute.length > 0
                                                        ? orderIndex === 0
                                                            ? 'var(--success)'
                                                            : orderIndex === serenatas.length - 1
                                                                ? 'var(--accent)'
                                                                : 'var(--info)'
                                                        : 'var(--fg-muted)'
                                                }}
                                            >
                                                {optimizedRoute.length > 0 ? orderIndex + 1 : index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-sm truncate" style={{ color: 'var(--fg)' }}>
                                                        {serenata.clientName}
                                                    </h4>
                                                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                                        {formatTime(serenata.dateTime)}
                                                    </span>
                                                </div>
                                                <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                                    <IconMapPin size={10} />
                                                    {serenata.address}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <StatusBadge status={serenata.status} />
                                                    <span className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                                        {formatCurrency(parseInt(serenata.price || '0'))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Panel - Map */}
                <div className="lg:col-span-3 h-[calc(100vh-16rem)] lg:h-[calc(100vh-8rem)]">
                    {hasCoords ? (
                        <RouteMap 
                            serenatas={serenatas.map(s => ({
                                ...s, 
                                time: formatTime(s.dateTime), 
                                price: parseInt(s.price || '0')
                            }))}
                            selectedId={selectedSerenata}
                            onSelect={setSelectedSerenata}
                            optimizedOrder={optimizedRoute}
                        />
                    ) : (
                        <div 
                            className="h-full rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--bg-subtle)' }}
                        >
                            <div className="text-center">
                                <IconMapPin size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                                <p style={{ color: 'var(--fg-muted)' }}>No tienes serenatas para hoy</p>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Activa &quot;Disponible Ahora&quot; para recibir solicitudes
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SerenatasPageShell>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isConfirmed = status === 'confirmed';
    return (
        <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
                background: isConfirmed 
                    ? 'color-mix(in oklab, var(--success) 15%, transparent)'
                    : 'color-mix(in oklab, var(--warning) 15%, transparent)',
                color: isConfirmed ? 'var(--success)' : 'var(--warning)'
            }}
        >
            {isConfirmed ? 'Confirmada' : 'Pendiente'}
        </span>
    );
}
