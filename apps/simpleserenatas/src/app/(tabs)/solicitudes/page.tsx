'use client';

import { useState, useEffect } from 'react';
import { 
  IconMapPin, 
  IconClock, 
  IconFlame,
  IconCheck,
  IconX,
  IconInfoCircle
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

  // Load available requests from API
  useEffect(() => {
    const loadSolicitudes = async () => {
      try {
        // Load urgent requests
        const urgentRes = await fetch(`${API_BASE}/api/serenatas/requests/urgent/list?limit=10`, {
          credentials: 'include',
        });
        const urgentData = await urgentRes.json();
        
        // Load available requests for musician
        const availableRes = await fetch(`${API_BASE}/api/serenatas/requests/available/for-musician`, {
          credentials: 'include',
        });
        const availableData = await availableRes.json();
        
        const allSolicitudes: Solicitud[] = [];
        
        if (urgentData.ok && urgentData.requests) {
          allSolicitudes.push(...urgentData.requests.map((r: any) => ({ ...r, urgency: 'urgent' })));
        }
        
        if (availableData.ok && availableData.requests) {
          allSolicitudes.push(...availableData.requests.map((r: any) => ({ ...r, urgency: 'normal' })));
        }
        
        setSolicitudes(allSolicitudes);
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

  const urgentSolicitudes = solicitudes.filter(s => s.urgency === 'urgent' && !respondedIds.includes(s.id));
  const normalSolicitudes = solicitudes.filter(s => s.urgency === 'normal' && !respondedIds.includes(s.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <IconInfoCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Acepta las solicitudes que puedas cumplir. Una vez aceptada, deberás confirmar tu asistencia.
        </p>
      </div>

      {/* Urgent Requests */}
      {urgentSolicitudes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <IconFlame size={20} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-zinc-900">Urgentes</h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {urgentSolicitudes.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {urgentSolicitudes.map((item) => {
              const { date, time, diffHours, isToday } = formatDateTime(item.dateTime);
              return (
                <div
                  key={item.id}
                  className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-xl p-4 border border-orange-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                          URGENTE
                        </span>
                        {isToday && (
                          <span className="text-xs text-orange-700 font-medium">
                            ¡Es hoy!
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-zinc-900">{item.clientName}</h3>
                      <p className="text-sm text-zinc-500">{time} · {date}</p>
                    </div>
                    <span className="text-lg font-bold text-zinc-900">{formatCurrency(parseInt(item.price || '0'))}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <IconMapPin size={16} />
                      <span>{item.address}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-rose-600 font-medium">{item.distance} km</span>
                    </div>
                    {item.message && (
                      <p className="text-sm text-zinc-600 italic">"{item.message}"</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {item.requiredInstruments.map((inst) => (
                        <span 
                          key={inst}
                          className="text-xs bg-white px-2 py-1 rounded border border-zinc-200"
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(item.id)}
                      className="flex-1 bg-rose-500 text-white rounded-lg py-2.5 font-medium hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <IconCheck size={18} />
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleDecline(item.id)}
                      className="flex-1 bg-zinc-100 text-zinc-700 rounded-lg py-2.5 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <IconX size={18} />
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Normal Requests */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Solicitudes Disponibles</h2>
        
        {normalSolicitudes.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl p-8 text-center">
            <IconClock size={48} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">No hay solicitudes disponibles</p>
            <p className="text-sm text-zinc-400 mt-1">Activa "Disponible Ahora" para recibir más</p>
          </div>
        ) : (
          <div className="space-y-3">
            {normalSolicitudes.map((item) => {
              const { date, time } = formatDateTime(item.dateTime);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 border border-zinc-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{item.clientName}</h3>
                      <p className="text-sm text-zinc-500">{time} · {date}</p>
                    </div>
                    <span className="text-lg font-bold text-zinc-900">{formatCurrency(parseInt(item.price || '0'))}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <IconMapPin size={16} />
                      <span>{item.address}</span>
                    </div>
                    {item.message && (
                      <p className="text-sm text-zinc-600 italic">"{item.message}"</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(item.id)}
                      className="flex-1 bg-rose-500 text-white rounded-lg py-2.5 font-medium hover:bg-rose-600 transition-colors"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleDecline(item.id)}
                      className="flex-1 bg-zinc-100 text-zinc-700 rounded-lg py-2.5 font-medium hover:bg-zinc-200 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
