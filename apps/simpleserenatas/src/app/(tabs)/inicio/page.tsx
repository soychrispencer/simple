'use client';

import { useState, useEffect } from 'react';
import { 
  IconMapPin, 
  IconClock, 
  IconMusic, 
  IconTrendingUp,
  IconPlus,
  IconRadio
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useAvailability } from '@/hooks/useAvailability';
import { API_BASE } from '@simple/config';

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  dateTime: string;
  status: string;
  price: string;
}

export default function HomePage() {
  const { musicianProfile } = useAuth();
  const { isAvailable, availableNow, toggleAvailableNow, isLoading: isToggling } = useAvailability();
  const [serenatas, setSerenatas] = useState<Serenata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayEarnings, setTodayEarnings] = useState(0);

  // Load serenatas from API
  useEffect(() => {
    const loadSerenatas = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.serenatas) {
          setSerenatas(data.serenatas);
          // Calculate today's earnings
          const today = new Date().toDateString();
          const todayTotal = data.serenatas
            .filter((s: Serenata) => new Date(s.dateTime).toDateString() === today)
            .reduce((sum: number, s: Serenata) => sum + parseInt(s.price || '0'), 0);
          setTodayEarnings(todayTotal);
        }
      } catch (error) {
        console.error('Failed to load serenatas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSerenatas();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Availability Toggle */}
      <div className={`bg-gradient-to-r rounded-2xl p-4 text-white shadow-lg transition-all ${
        availableNow 
          ? 'from-rose-500 to-rose-600' 
          : 'from-zinc-600 to-zinc-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${availableNow ? 'bg-white/20' : 'bg-white/10'}`}>
              <IconRadio size={24} />
            </div>
            <div>
              <p className="font-semibold text-lg">
                {availableNow ? 'Disponible Ahora' : 'No Disponible'}
              </p>
              <p className="text-white/80 text-sm">
                {availableNow 
                  ? 'Recibiendo solicitudes urgentes' 
                  : 'Activa para recibir trabajo'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAvailableNow}
            disabled={isToggling}
            className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
              availableNow ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform duration-300 ${
                availableNow ? 'translate-x-6 bg-rose-500' : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <IconTrendingUp size={16} />
            <span className="text-xs font-medium">Hoy</span>
          </div>
          <p className="text-xl font-bold text-zinc-900">{formatCurrency(todayEarnings)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-zinc-100">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <IconMusic size={16} />
            <span className="text-xs font-medium">Próximas</span>
          </div>
          <p className="text-xl font-bold text-zinc-900">{serenatas.length} serenatas</p>
        </div>
      </div>

      {/* Upcoming Serenatas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-zinc-900">Próximas Serenatas</h2>
          <Link 
            href="/agenda" 
            className="text-sm text-rose-600 font-medium hover:text-rose-700"
          >
            Ver todas
          </Link>
        </div>

        {serenatas.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl p-8 text-center">
            <IconMusic size={48} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">No tienes serenatas programadas</p>
            <p className="text-sm text-zinc-400 mt-1">Activa "Disponible Ahora" para recibir solicitudes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serenatas.slice(0, 5).map((serenata: Serenata) => {
              const { date, time } = formatDateTime(serenata.dateTime);
              return (
                <Link
                  key={serenata.id}
                  href={`/serenata/${serenata.id}`}
                  className="block bg-white rounded-xl p-4 shadow-sm border border-zinc-100 hover:border-rose-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Confirmada
                        </span>
                        <span className="text-sm font-semibold text-zinc-900">
                          {formatCurrency(parseInt(serenata.price || '0'))}
                        </span>
                      </div>
                      <h3 className="font-semibold text-zinc-900 mb-1">{serenata.clientName}</h3>
                      <div className="flex items-center gap-1 text-sm text-zinc-500">
                        <IconMapPin size={14} />
                        <span className="truncate">{serenata.address}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-zinc-900">{time}</p>
                      <p className="text-xs text-zinc-500">{date}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/grupos"
          className="flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-xl p-4 font-medium hover:bg-zinc-800 transition-colors"
        >
          <IconPlus size={20} />
          <span>Crear Grupo</span>
        </Link>
        <Link
          href="/mapa"
          className="flex items-center justify-center gap-2 bg-rose-500 text-white rounded-xl p-4 font-medium hover:bg-rose-600 transition-colors"
        >
          <IconMapPin size={20} />
          <span>Ver Mapa</span>
        </Link>
      </div>
    </div>
  );
}
