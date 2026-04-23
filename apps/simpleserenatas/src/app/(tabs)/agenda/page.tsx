'use client';

import { useState, useEffect } from 'react';
import { 
  IconMapPin, 
  IconClock, 
  IconCheck,
  IconX,
  IconCurrencyDollar
} from '@tabler/icons-react';
import Link from 'next/link';
import { API_BASE } from '@simple/config';

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  dateTime: string;
  status: string;
  price: string;
}

const filters = ['Todas', 'Pendientes', 'Confirmadas', 'Completadas'];

export default function AgendaPage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [agendaItems, setAgendaItems] = useState<Serenata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load serenatas from API
  useEffect(() => {
    const loadSerenatas = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.serenatas) {
          setAgendaItems(data.serenatas);
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
      day: date.toLocaleDateString('es-CL', { day: 'numeric' }),
      month: date.toLocaleDateString('es-CL', { month: 'short' }),
      time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      fullDate: date.toLocaleDateString('es-CL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      }),
    };
  };

  const filteredItems = agendaItems.filter(item => {
    if (activeFilter === 'Todas') return true;
    if (activeFilter === 'Pendientes') return item.status === 'pending';
    if (activeFilter === 'Confirmadas') return item.status === 'confirmed';
    if (activeFilter === 'Completadas') return item.status === 'completed';
    return true;
  });

  // Group by date
  const groupedByDate = filteredItems.reduce((acc, item) => {
    const date = new Date(item.dateTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof agendaItems>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Agenda List */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div className="bg-zinc-50 rounded-xl p-8 text-center">
          <IconClock size={48} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">No hay serenatas en tu agenda</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => {
            const { fullDate } = formatDateTime(items[0].dateTime);
            return (
              <div key={date}>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  {fullDate}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const { time } = formatDateTime(item.dateTime);
                    return (
                      <Link
                        key={item.id}
                        href={`/serenata/${item.id}`}
                        className="block bg-white rounded-xl p-4 shadow-sm border border-zinc-100 hover:border-rose-200 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Time */}
                          <div className="flex-shrink-0 text-center">
                            <p className="text-lg font-bold text-zinc-900">{time}</p>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-zinc-900 truncate">
                                {item.clientName}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : item.status === 'completed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status === 'confirmed' && <IconCheck size={12} className="mr-1" />}
                                {item.status === 'pending' && <IconX size={12} className="mr-1" />}
                                {item.status === 'confirmed' ? 'Confirmada' : 
                                 item.status === 'completed' ? 'Completada' : 'Pendiente'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-sm text-zinc-500 mb-2">
                              <IconMapPin size={14} />
                              <span className="truncate">{item.address}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-zinc-900">
                                {formatCurrency(parseInt(item.price || '0'))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
