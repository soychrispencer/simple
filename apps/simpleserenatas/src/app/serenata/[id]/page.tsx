'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconMapPin, 
  IconClock, 
  IconUser,
  IconPhone,
  IconConfetti,
  IconCheck,
  IconArrowLeft,
  IconCurrencyDollar,
  IconCalendar
} from '@tabler/icons-react';
import Link from 'next/link';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';

interface Serenata {
  id: string;
  clientName: string;
  clientPhone: string;
  address: string;
  comuna: string;
  dateTime: string;
  duration: number;
  price: string;
  status: string;
  occasion: string;
  message: string | null;
  requiredInstruments: string[];
}

const occasionLabels: Record<string, string> = {
  birthday: 'Cumpleaños',
  anniversary: 'Aniversario',
  love: 'Amor',
  graduation: 'Graduación',
  other: 'Otro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  assigned: { label: 'Asignada', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completada', color: 'bg-zinc-100 text-zinc-800' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export default function SerenataDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [serenata, setSerenata] = useState<Serenata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const loadSerenata = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/requests/${params.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.request) {
          setSerenata(data.request);
        }
      } catch {
        showToast('Error al cargar la serenata', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSerenata();
  }, [params.id, showToast]);

  const handleComplete = async () => {
    if (!confirm('¿Confirmas que completaste esta serenata?')) return;
    
    setIsCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/requests/${params.id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.ok) {
        setSerenata(prev => prev ? { ...prev, status: 'completed' } : null);
        showToast('Serenata completada', 'success');
      } else {
        showToast(data.error || 'Error al completar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(parseInt(amount || '0'));
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('es-CL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!serenata) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Serenata no encontrada</p>
          <Link href="/agenda" className="text-rose-600 font-medium">
            Volver a la agenda
          </Link>
        </div>
      </div>
    );
  }

  const { date, time } = formatDateTime(serenata.dateTime);
  const status = statusLabels[serenata.status] || { label: serenata.status, color: 'bg-zinc-100' };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-zinc-200">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/agenda" 
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <IconArrowLeft size={24} className="text-zinc-700" />
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">Detalle de Serenata</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 ${status.color}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{status.label}</span>
            <span className="text-lg font-bold">
              {formatCurrency(serenata.price)}
            </span>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 mb-3">INFORMACIÓN DEL CLIENTE</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                <IconUser size={20} className="text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{serenata.clientName}</p>
                <p className="text-sm text-zinc-500">Cliente</p>
              </div>
            </div>
            <a 
              href={`tel:${serenata.clientPhone}`}
              className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <IconPhone size={20} className="text-zinc-500" />
              <span className="text-zinc-900">{serenata.clientPhone}</span>
            </a>
          </div>
        </div>

        {/* Location & Time */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 mb-3">UBICACIÓN Y HORARIO</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <IconMapPin size={20} className="text-zinc-400 mt-0.5" />
              <div>
                <p className="text-zinc-900">{serenata.address}</p>
                <p className="text-sm text-zinc-500">{serenata.comuna}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconCalendar size={20} className="text-zinc-400" />
              <span className="text-zinc-900 capitalize">{date}</span>
            </div>
            <div className="flex items-center gap-3">
              <IconClock size={20} className="text-zinc-400" />
              <span className="text-zinc-900">{time} ({serenata.duration} minutos)</span>
            </div>
          </div>
        </div>

        {/* Occasion & Message */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 mb-3">DETALLES</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IconConfetti size={20} className="text-zinc-400" />
              <span className="text-zinc-900">{occasionLabels[serenata.occasion] || serenata.occasion}</span>
            </div>
            {serenata.message && (
              <div className="p-3 bg-rose-50 rounded-lg">
                <p className="text-sm text-rose-800">{serenata.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Required Instruments */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 mb-3">INSTRUMENTOS REQUERIDOS</h2>
          <div className="flex flex-wrap gap-2">
            {serenata.requiredInstruments.map((inst) => (
              <span 
                key={inst}
                className="px-3 py-1 bg-zinc-100 rounded-full text-sm text-zinc-700"
              >
                {inst}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {serenata.status === 'confirmed' && (
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full bg-green-500 text-white rounded-xl py-4 font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <IconCheck size={20} />
                Marcar como Completada
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
