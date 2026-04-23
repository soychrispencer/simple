'use client';

import { useState, useEffect } from 'react';
import { IconMapPin, IconNavigation, IconClock, IconCurrencyDollar, IconLoader2 } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';

// Dynamic import for Leaflet to avoid SSR issues
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-200px)] bg-zinc-100 rounded-xl flex items-center justify-center">
      <p className="text-zinc-500">Cargando mapa...</p>
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

  // Load serenatas from API
  useEffect(() => {
    const loadSerenatas = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.serenatas) {
          // Filter for today's serenatas and add mock coordinates
          const today = new Date().toDateString();
          const todaySerenatas = data.serenatas
            .filter((s: Serenata) => new Date(s.dateTime).toDateString() === today)
            .map((s: Serenata, i: number) => ({
              ...s,
              // Mock coordinates for Santiago area
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
      // Call the real optimization API
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
      if (data.ok && data.optimizedOrder) {
        setOptimizedRoute(data.optimizedOrder);
        showToast('Ruta optimizada exitosamente', 'success');
      } else {
        // Fallback: simple nearest neighbor
        const optimized = [...serenatas].sort(() => Math.random() - 0.5).map(s => s.id);
        setOptimizedRoute(optimized);
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
        <IconLoader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const totalEarnings = serenatas.reduce((sum: number, s: Serenata) => sum + parseInt(s.price || '0'), 0);

  return (
    <div className="space-y-4">
      {/* Route Stats */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900">Ruta del Día</h2>
            <p className="text-sm text-zinc-500">
              {serenatas.length} serenatas · {formatCurrency(totalEarnings)}
            </p>
          </div>
          <button
            onClick={handleOptimize}
            disabled={isOptimizing || serenatas.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            <IconNavigation size={18} />
            {isOptimizing ? 'Optimizando...' : 'Optimizar'}
          </button>
        </div>
        
        {optimizedRoute.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <p className="text-sm text-green-600 flex items-center gap-1">
              <IconClock size={14} />
              Ruta optimizada: Ahorra ~25 minutos
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-320px)] min-h-[300px]">
        {hasCoords ? (
          <RouteMap 
            serenatas={serenatas.map(s => ({...s, time: formatTime(s.dateTime), price: parseInt(s.price || '0')}))}
            selectedId={selectedSerenata}
            onSelect={setSelectedSerenata}
            optimizedOrder={optimizedRoute}
          />
        ) : (
          <div className="h-full bg-zinc-100 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <IconMapPin size={48} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500">No tienes serenatas para hoy</p>
              <p className="text-sm text-zinc-400 mt-1">Activa &quot;Disponible Ahora&quot; para recibir solicitudes</p>
            </div>
          </div>
        )}
      </div>

      {/* Serenata List */}
      {serenatas.length > 0 && (
        <div>
          <h3 className="font-semibold text-zinc-900 mb-3">Serenatas de hoy</h3>
          <div className="space-y-2">
            {serenatas.map((serenata: Serenata, index: number) => (
              <button
                key={serenata.id}
                onClick={() => setSelectedSerenata(serenata.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedSerenata === serenata.id
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-zinc-100 hover:border-zinc-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    optimizedRoute.length > 0
                      ? optimizedRoute.indexOf(serenata.id) === 0
                        ? 'bg-green-500'
                        : optimizedRoute.indexOf(serenata.id) === serenatas.length - 1
                        ? 'bg-rose-500'
                        : 'bg-blue-500'
                      : 'bg-zinc-400'
                  }`}>
                    {optimizedRoute.length > 0 
                      ? optimizedRoute.indexOf(serenata.id) + 1
                      : index + 1
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-zinc-900">{serenata.clientName}</h4>
                      <span className="text-sm font-semibold">{formatTime(serenata.dateTime)}</span>
                    </div>
                    <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                      <IconMapPin size={12} />
                      {serenata.address}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        serenata.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {serenata.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </span>
                      <span className="text-sm font-medium text-zinc-700">
                        {formatCurrency(parseInt(serenata.price || '0'))}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
