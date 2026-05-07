'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconMapPin,
    IconNavigation,
    IconClock,
    IconLoader2,
    IconPlayerPlay,
    IconCircleCheck,
} from '@tabler/icons-react';
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

/** Orden guardado en servidor fusionado con la lista actual (altas/bajas de serenatas). */
function mergeWaypointOrder(savedIds: string[], currentIds: string[]): string[] {
    const out: string[] = [];
    const currentSet = new Set(currentIds);
    for (const id of savedIds) {
        if (currentSet.has(id)) out.push(id);
    }
    for (const id of currentIds) {
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

export default function MapaPage() {
    const searchParams = useSearchParams();
    const groupId = searchParams.get('groupId');
    const [selectedSerenata, setSelectedSerenata] = useState<string | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
    const { showToast } = useToast();
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [withoutCoords, setWithoutCoords] = useState<Serenata[]>([]);
    const [groupDateIso, setGroupDateIso] = useState<string | null>(null);
    const [savedRouteMeta, setSavedRouteMeta] = useState<{
        totalDistance: string;
        totalDuration: number;
    } | null>(null);
    const [persistedRoute, setPersistedRoute] = useState<{
        id: string;
        status: string;
        startedAt?: string | null;
        completedAt?: string | null;
    } | null>(null);
    const [routeActionLoading, setRouteActionLoading] = useState(false);

    useEffect(() => {
        const loadSerenatas = async () => {
            try {
                let rawSerenatas: Array<Record<string, unknown>> = [];
                let savedWaypointIds: string[] | null = null;

                if (groupId) {
                    const groupRes = await fetch(`${API_BASE}/api/serenatas/groups/${groupId}`, {
                        credentials: 'include',
                    });
                    const groupData = await groupRes.json();
                    if (!groupData.ok || !groupData.group) {
                        throw new Error(groupData.error || 'No se pudo cargar el grupo');
                    }
                    const g = groupData.group as { date?: string | Date; assignments?: unknown[] };
                    setGroupDateIso(
                        g.date != null ? new Date(String(g.date)).toISOString() : null
                    );

                    rawSerenatas = (g.assignments ?? [])
                        .map((a) => (a as Record<string, unknown>).serenata as Record<string, unknown>)
                        .filter(Boolean);

                    const routeRes = await fetch(
                        `${API_BASE}/api/serenatas/routes/group/${groupId}`,
                        { credentials: 'include' }
                    );
                    const routeJson = await routeRes.json();
                    if (routeRes.ok && routeJson.ok && routeJson.route) {
                        const r = routeJson.route as {
                            id?: string;
                            status?: string;
                            startedAt?: string | null;
                            completedAt?: string | null;
                            waypoints?: unknown;
                            totalDistance?: unknown;
                            totalDuration?: unknown;
                        };
                        if (r.id) {
                            setPersistedRoute({
                                id: String(r.id),
                                status: String(r.status ?? 'planned'),
                                startedAt: r.startedAt ?? null,
                                completedAt: r.completedAt ?? null,
                            });
                        }
                        if (r.waypoints && Array.isArray(r.waypoints)) {
                            savedWaypointIds = r.waypoints
                                .map((w: { serenataId?: string }) => String(w.serenataId ?? ''))
                                .filter(Boolean);
                            setSavedRouteMeta({
                                totalDistance: String(r.totalDistance ?? ''),
                                totalDuration: Number(r.totalDuration ?? 0),
                            });
                        } else {
                            setSavedRouteMeta(null);
                        }
                    } else {
                        setSavedRouteMeta(null);
                        setPersistedRoute(null);
                    }
                } else {
                    setGroupDateIso(null);
                    setSavedRouteMeta(null);
                    setPersistedRoute(null);
                    const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
                        credentials: 'include',
                    });
                    const data = await res.json();
                    if (!data.ok || !Array.isArray(data.serenatas)) {
                        throw new Error(data.error || 'No se pudo cargar serenatas');
                    }
                    const today = new Date().toDateString();
                    rawSerenatas = data.serenatas.filter(
                        (s: Record<string, unknown>) =>
                            new Date(String(s.dateTime ?? '')).toDateString() === today
                    );
                }

                const mapped: Serenata[] = rawSerenatas.map((s) => ({
                    id: String(s.id ?? ''),
                    clientName: String(s.clientName ?? 'Cliente'),
                    address: String(s.address ?? 'Sin dirección'),
                    lat: Number(s.lat ?? s.latitude ?? NaN),
                    lng: Number(s.lng ?? s.longitude ?? NaN),
                    dateTime: String(s.dateTime ?? ''),
                    status: String(s.status ?? 'pending'),
                    price: String(s.price ?? '0'),
                }));

                const withCoords = mapped.filter(
                    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)
                );
                const noCoords = mapped.filter(
                    (s) => !Number.isFinite(s.lat) || !Number.isFinite(s.lng)
                );

                setSerenatas(withCoords);
                setWithoutCoords(noCoords);

                if (savedWaypointIds && savedWaypointIds.length > 0) {
                    setOptimizedRoute(
                        mergeWaypointOrder(
                            savedWaypointIds,
                            withCoords.map((s) => s.id)
                        )
                    );
                } else {
                    setOptimizedRoute([]);
                }
            } catch {
                showToast('Error al cargar serenatas', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadSerenatas();
    }, [showToast, groupId]);

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
                const order = data.optimized
                    .map((w: { serenataId?: string; id?: string }) => w.serenataId || w.id || '')
                    .filter(Boolean);
                setOptimizedRoute(order);

                if (groupId && data.optimized.length > 0) {
                    const saveRes = await fetch(`${API_BASE}/api/serenatas/routes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            groupId,
                            date: groupDateIso ?? new Date().toISOString(),
                            waypoints: data.optimized.map(
                                (w: {
                                    lat: number;
                                    lng: number;
                                    serenataId: string;
                                    address: string;
                                    estimatedTime: string;
                                }) => ({
                                    lat: w.lat,
                                    lng: w.lng,
                                    serenataId: w.serenataId,
                                    address: w.address,
                                    estimatedTime: w.estimatedTime,
                                })
                            ),
                        }),
                    });
                    const saveData = await saveRes.json();
                    if (saveData.ok && saveData.route) {
                        setSavedRouteMeta({
                            totalDistance: String(saveData.route.totalDistance ?? ''),
                            totalDuration: Number(saveData.route.totalDuration ?? 0),
                        });
                        const pr = saveData.route as {
                            id?: string;
                            status?: string;
                            startedAt?: string | null;
                            completedAt?: string | null;
                        };
                        if (pr.id) {
                            setPersistedRoute({
                                id: String(pr.id),
                                status: String(pr.status ?? 'planned'),
                                startedAt: pr.startedAt ?? null,
                                completedAt: pr.completedAt ?? null,
                            });
                        }
                        showToast('Ruta optimizada y guardada', 'success');
                    } else {
                        showToast(
                            saveData.error || 'Ruta optimizada; no se pudo guardar en el servidor',
                            'info'
                        );
                    }
                } else {
                    showToast('Ruta optimizada', 'success');
                }
            } else {
                showToast(data.error || 'No pudimos optimizar la ruta', 'error');
            }
        } catch {
            showToast('Error al optimizar ruta', 'error');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleStartRoute = async () => {
        if (!persistedRoute?.id) return;
        setRouteActionLoading(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/routes/${persistedRoute.id}/start`,
                { method: 'POST', credentials: 'include' }
            );
            const data = await res.json();
            if (data.ok && data.route) {
                const r = data.route as {
                    status?: string;
                    startedAt?: string | null;
                    completedAt?: string | null;
                };
                setPersistedRoute((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: String(r.status ?? 'active'),
                              startedAt: r.startedAt ?? prev.startedAt,
                              completedAt: r.completedAt ?? prev.completedAt,
                          }
                        : null
                );
                showToast('Ruta iniciada', 'success');
            } else {
                showToast(data.error || 'No se pudo iniciar la ruta', 'error');
            }
        } catch {
            showToast('Error al iniciar la ruta', 'error');
        } finally {
            setRouteActionLoading(false);
        }
    };

    const handleCompleteRoute = async () => {
        if (!persistedRoute?.id) return;
        setRouteActionLoading(true);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/routes/${persistedRoute.id}/complete`,
                { method: 'POST', credentials: 'include' }
            );
            const data = await res.json();
            if (data.ok && data.route) {
                const r = data.route as {
                    status?: string;
                    startedAt?: string | null;
                    completedAt?: string | null;
                };
                setPersistedRoute((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: String(r.status ?? 'completed'),
                              startedAt: r.startedAt ?? prev.startedAt,
                              completedAt: r.completedAt ?? prev.completedAt,
                          }
                        : null
                );
                showToast('Ruta completada', 'success');
            } else {
                showToast(data.error || 'No se pudo completar la ruta', 'error');
            }
        } catch {
            showToast('Error al completar la ruta', 'error');
        } finally {
            setRouteActionLoading(false);
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

                        {groupId && persistedRoute && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                        background:
                                            persistedRoute.status === 'completed'
                                                ? 'color-mix(in oklab, var(--success) 18%, transparent)'
                                                : persistedRoute.status === 'active'
                                                  ? 'color-mix(in oklab, var(--info) 18%, transparent)'
                                                  : 'color-mix(in oklab, var(--fg-muted) 12%, transparent)',
                                        color:
                                            persistedRoute.status === 'completed'
                                                ? 'var(--success)'
                                                : persistedRoute.status === 'active'
                                                  ? 'var(--info)'
                                                  : 'var(--fg-muted)',
                                    }}
                                >
                                    {persistedRoute.status === 'completed'
                                        ? 'Completada'
                                        : persistedRoute.status === 'active'
                                          ? 'En curso'
                                          : 'Planeada'}
                                </span>
                                {persistedRoute.status === 'planned' && (
                                    <button
                                        type="button"
                                        onClick={handleStartRoute}
                                        disabled={routeActionLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                                        style={{
                                            background: 'var(--success)',
                                            color: 'var(--accent-contrast)',
                                        }}
                                    >
                                        {routeActionLoading ? (
                                            <IconLoader2 size={16} className="animate-spin" />
                                        ) : (
                                            <IconPlayerPlay size={16} />
                                        )}
                                        Iniciar ruta
                                    </button>
                                )}
                                {persistedRoute.status === 'active' && (
                                    <button
                                        type="button"
                                        onClick={handleCompleteRoute}
                                        disabled={routeActionLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 border"
                                        style={{
                                            borderColor: 'var(--border-strong)',
                                            color: 'var(--fg)',
                                            background: 'var(--bg-elevated)',
                                        }}
                                    >
                                        {routeActionLoading ? (
                                            <IconLoader2 size={16} className="animate-spin" />
                                        ) : (
                                            <IconCircleCheck size={16} />
                                        )}
                                        Completar ruta
                                    </button>
                                )}
                            </div>
                        )}
                        {groupId && !persistedRoute && serenatas.length >= 2 && (
                            <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                Optimiza y guarda la ruta para poder iniciar el recorrido con el grupo.
                            </p>
                        )}
                        
                        {optimizedRoute.length > 0 && (
                            <div className="mt-3 pt-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-2">
                                    <IconClock size={14} style={{ color: 'var(--success)' }} />
                                    <p className="text-sm" style={{ color: 'var(--success)' }}>
                                        {groupId ? 'Orden de visitas listo' : 'Ruta optimizada'}
                                    </p>
                                </div>
                                {savedRouteMeta && savedRouteMeta.totalDistance && (
                                    <p className="text-xs pl-6" style={{ color: 'var(--fg-muted)' }}>
                                        ~{savedRouteMeta.totalDistance} km
                                        {savedRouteMeta.totalDuration > 0
                                            ? ` · ~${savedRouteMeta.totalDuration} min`
                                            : ''}
                                    </p>
                                )}
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
                    {withoutCoords.length > 0 && (
                        <div className="card">
                            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--fg)' }}>
                                Sin coordenadas ({withoutCoords.length})
                            </h3>
                            <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>
                                Estas serenatas no se pueden mostrar en el mapa todavía.
                            </p>
                            <div className="space-y-2">
                                {withoutCoords.map((s) => (
                                    <div key={s.id} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            {s.clientName}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {s.address}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Map */}
                <div className="lg:col-span-3 h-[calc(100vh-16rem)] lg:h-[calc(100vh-8rem)]">
                    {serenatas.length > 0 ? (
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
                                <p style={{ color: 'var(--fg-muted)' }}>
                                    {groupId ? 'Este grupo no tiene serenatas con coordenadas' : 'No tienes serenatas para hoy'}
                                </p>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Revisa la lista lateral de serenatas sin coordenadas.
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
