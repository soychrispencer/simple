'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconMapPin,
  IconRoute,
  IconClock,
  IconCalendar,
  IconCheck,
  IconPlayerPlay,
  IconFlag,
  IconTrendingUp,
  IconLoader2,
  IconUsers,
  IconConfetti,
  IconMap,
} from '@tabler/icons-react';
import Link from 'next/link';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';
import RouteMap from '@/components/RouteMap';

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
      <div className="flex items-center justify-center min-h-screen">
        <IconLoader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <IconRoute className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Ruta no encontrada</h1>
          <p className="text-zinc-500 mb-4">La ruta que buscas no existe o no está disponible</p>
          <Link href="/agenda" className="text-blue-600 hover:text-blue-700 font-medium">
            Volver a la agenda
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-zinc-100 text-zinc-700';
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

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <IconArrowLeft className="w-5 h-5 text-zinc-700" />
            </button>
            <div>
              <h1 className="font-semibold text-zinc-900">{route.groupName}</h1>
              <p className="text-sm text-zinc-500">
                {new Date(route.date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(route.status)}`}>
              {getStatusText(route.status)}
            </span>

            <div className="flex gap-2">
              {route.status === 'planned' && (
                <button
                  onClick={handleStart}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isActionLoading ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconPlayerPlay className="w-4 h-4" />
                  )}
                  Iniciar
                </button>
              )}

              {route.status === 'in_progress' && (
                <button
                  onClick={handleComplete}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isActionLoading ? (
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconFlag className="w-4 h-4" />
                  )}
                  Completar
                </button>
              )}

              {route.status === 'planned' && (
                <button
                  onClick={handleOptimize}
                  disabled={isActionLoading}
                  className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  <IconTrendingUp className="w-4 h-4" />
                  Optimizar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-64 bg-zinc-100">
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

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
              <IconTrendingUp className="w-5 h-5 text-blue-500" />
              Estadísticas
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-zinc-50 rounded-lg">
                <p className="text-2xl font-bold text-zinc-900">{stats.completedStops}</p>
                <p className="text-xs text-zinc-500">Completadas</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg">
                <p className="text-2xl font-bold text-zinc-900">{stats.totalDistance.toFixed(1)}</p>
                <p className="text-xs text-zinc-500">Km recorridos</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg">
                <p className="text-2xl font-bold text-zinc-900">{stats.averageTimePerStop}</p>
                <p className="text-xs text-zinc-500">Min por parada</p>
              </div>
            </div>
          </div>
        )}

        {/* Route Info */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
            <IconRoute className="w-5 h-5 text-blue-500" />
            Información de la ruta
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Distancia total</span>
              <span className="font-medium">{route.totalDistance.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Duración estimada</span>
              <span className="font-medium">{Math.round(route.estimatedDuration)} min</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Total de paradas</span>
              <span className="font-medium">{route.stops.length}</span>
            </div>
            {route.startTime && (
              <div className="flex justify-between py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Hora de inicio</span>
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
                <span className="text-zinc-500">Hora de fin</span>
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-zinc-900 mb-4 flex items-center gap-2">
            <IconMapPin className="w-5 h-5 text-blue-500" />
            Paradas ({route.stops.length})
          </h3>
          <div className="space-y-3">
            {route.stops.map((stop, index) => (
              <Link
                key={stop.id}
                href={`/serenata/${stop.serenataId}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    stop.status === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : stop.status === 'skipped'
                      ? 'bg-zinc-100 text-zinc-400'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {stop.status === 'completed' ? (
                    <IconCheck className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 truncate">{stop.address}</p>
                  {stop.estimatedTime && (
                    <p className="text-sm text-zinc-500">
                      Estimado: {stop.estimatedTime}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
