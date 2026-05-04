'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconMapPin,
  IconRoute,
  IconCheck,
  IconPlayerPlay,
  IconFlag,
  IconTrendingUp,
  IconLoader2,
} from '@tabler/icons-react';
import Link from 'next/link';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';
import RouteMap from '@/components/RouteMap';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
  serenataId: string;
  status: 'pending' | 'completed' | 'skipped';
  estimatedTime?: string;
}

interface Route {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  status: 'planned' | 'in_progress' | 'completed';
  stops: RouteStop[];
  totalDistance: number;
  estimatedDuration: number;
  startTime?: string;
  endTime?: string;
}

interface RouteStats {
  totalStops: number;
  completedStops: number;
  totalDistance: number;
  averageTimePerStop: number;
}

export default function RouteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [route, setRoute] = useState<Route | null>(null);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const loadRoute = async () => {
      try {
        const [routeRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/serenatas/routes/${params.id}`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE}/api/serenatas/routes/${params.id}/stats`, {
            credentials: 'include',
          }),
        ]);

        const routeData = await routeRes.json();
        const statsData = await statsRes.json();

        if (routeData.ok && routeData.route) {
          setRoute(routeData.route);
        } else {
          showToast('Ruta no encontrada', 'error');
        }

        if (statsData.ok) {
          setStats(statsData.stats);
        }
      } catch {
        showToast('Error al cargar la ruta', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoute();
  }, [params.id, showToast]);

  const handleOptimize = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/routes/optimize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: params.id }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast('Ruta optimizada exitosamente', 'success');
        // Reload route
        window.location.reload();
      } else {
        showToast(data.error || 'Error al optimizar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStart = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/routes/${params.id}/start`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (data.ok) {
        showToast('Ruta iniciada', 'success');
        setRoute((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
      } else {
        showToast(data.error || 'Error al iniciar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/routes/${params.id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (data.ok) {
        showToast('Ruta completada', 'success');
        setRoute((prev) => (prev ? { ...prev, status: 'completed' } : null));
      } else {
        showToast(data.error || 'Error al completar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <IconLoader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
        <div className="text-center">
          <IconRoute className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--fg-muted)' }} />
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Ruta no encontrada</h1>
          <p className="mb-4" style={{ color: 'var(--fg-secondary)' }}>La ruta que buscas no existe o no está disponible</p>
          <Link href="/agenda" className="font-medium" style={{ color: 'var(--accent)' }}>
            Volver a la agenda
          </Link>
        </div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'planned':
        return { background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)', color: 'var(--info)' };
      case 'in_progress':
        return { background: 'color-mix(in oklab, var(--surface) 75%, var(--warning) 25%)', color: 'var(--warning)' };
      case 'completed':
        return { background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)', color: 'var(--success)' };
      default:
        return { background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planificada';
      case 'in_progress':
        return 'En progreso';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const routeDateLabel = new Date(route.date).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="serenatas-interactive -ml-2 mb-4 flex items-center gap-2 rounded-lg p-2"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <SerenatasPageHeader title={route.groupName} description={routeDateLabel} className="!mb-4" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full px-3 py-1 text-sm font-medium" style={getStatusStyle(route.status)}>
              {getStatusText(route.status)}
            </span>

            <div className="flex flex-wrap justify-end gap-2">
              {route.status === 'planned' && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                  style={{ background: 'var(--info)', color: 'var(--accent-contrast)' }}
                >
                  {isActionLoading ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconPlayerPlay className="h-4 w-4" />
                  )}
                  Iniciar
                </button>
              )}

              {route.status === 'in_progress' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                  style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
                >
                  {isActionLoading ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconFlag className="h-4 w-4" />
                  )}
                  Completar
                </button>
              )}

              {route.status === 'planned' && (
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 rounded-lg border px-4 py-2 font-medium disabled:opacity-50"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                >
                  <IconTrendingUp className="h-4 w-4" />
                  Optimizar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-64" style={{ background: 'var(--bg-subtle)' }}>
        <RouteMap
          serenatas={route.stops.map((stop, index) => ({
            id: stop.serenataId,
            clientName: `Parada ${index + 1}`,
            address: stop.address,
            lat: stop.lat,
            lng: stop.lng,
            time: stop.estimatedTime || 'N/A',
            status: stop.status,
            price: 0,
          }))}
          optimizedOrder={route.stops.map(s => s.serenataId)}
        />
      </div>

      <SerenatasPageShell width="default" className="max-w-2xl space-y-4">
        {/* Stats */}
        {stats && (
          <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
              <IconTrendingUp className="w-5 h-5" style={{ color: 'var(--info)' }} />
              Estadísticas
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{stats.completedStops}</p>
                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Completadas</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{stats.totalDistance.toFixed(1)}</p>
                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Km recorridos</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{stats.averageTimePerStop}</p>
                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Min por parada</p>
              </div>
            </div>
          </div>
        )}

        {/* Route Info */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <IconRoute className="w-5 h-5" style={{ color: 'var(--info)' }} />
            Información de la ruta
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--fg-secondary)' }}>Distancia total</span>
              <span className="font-medium">{route.totalDistance.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--fg-secondary)' }}>Duración estimada</span>
              <span className="font-medium">{Math.round(route.estimatedDuration)} min</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--fg-secondary)' }}>Total de paradas</span>
              <span className="font-medium">{route.stops.length}</span>
            </div>
            {route.startTime && (
              <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span style={{ color: 'var(--fg-secondary)' }}>Hora de inicio</span>
                <span className="font-medium">
                  {new Date(route.startTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {route.endTime && (
              <div className="flex justify-between py-2">
                <span style={{ color: 'var(--fg-secondary)' }}>Hora de fin</span>
                <span className="font-medium">
                  {new Date(route.endTime).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stops List */}
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <IconMapPin className="w-5 h-5" style={{ color: 'var(--info)' }} />
            Paradas ({route.stops.length})
          </h3>
          <div className="space-y-3">
            {route.stops.map((stop, index) => (
              <Link
                key={stop.id}
                href={`/serenata/${stop.serenataId}`}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={
                    stop.status === 'completed'
                      ? { background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)', color: 'var(--success)' }
                      : stop.status === 'skipped'
                      ? { background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }
                      : { background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)', color: 'var(--info)' }
                  }
                >
                  {stop.status === 'completed' ? (
                    <IconCheck className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>{stop.address}</p>
                  {stop.estimatedTime && (
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                      Estimado: {stop.estimatedTime}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SerenatasPageShell>
    </div>
  );
}
