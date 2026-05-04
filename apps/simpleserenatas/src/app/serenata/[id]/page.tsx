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
  IconCalendar
} from '@tabler/icons-react';
import Link from 'next/link';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

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

const statusLabels: Record<string, { label: string; bg: string; fg: string }> = {
  pending: {
    label: 'Pendiente',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--warning) 25%)',
    fg: 'var(--warning)',
  },
  assigned: {
    label: 'Asignada',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)',
    fg: 'var(--info)',
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
    fg: 'var(--success)',
  },
  completed: {
    label: 'Completada',
    bg: 'var(--bg-subtle)',
    fg: 'var(--fg-secondary)',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--error) 25%)',
    fg: 'var(--error)',
  },
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!serenata) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--fg-secondary)' }}>Serenata no encontrada</p>
          <Link href="/agenda" className="font-medium" style={{ color: 'var(--accent)' }}>
            Volver a la agenda
          </Link>
        </div>
      </div>
    );
  }

  const { date, time } = formatDateTime(serenata.dateTime);
  const status = statusLabels[serenata.status] || { label: serenata.status, bg: 'var(--bg-subtle)', fg: 'var(--fg-secondary)' };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/agenda"
            className="serenatas-interactive shrink-0 rounded-full p-2 transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <IconArrowLeft size={24} />
          </Link>
          <SerenatasPageHeader title="Detalle de serenata" className="min-w-0 !mb-0 flex-1" />
        </div>
      </div>

      <SerenatasPageShell width="default" className="space-y-4">
        {/* Status Banner */}
        <div className="rounded-xl p-4" style={{ background: status.bg, color: status.fg }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{status.label}</span>
            <span className="text-lg font-bold">
              {formatCurrency(serenata.price)}
            </span>
          </div>
        </div>

        {/* Client Info */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>INFORMACIÓN DEL CLIENTE</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                <IconUser size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--fg)' }}>{serenata.clientName}</p>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Cliente</p>
              </div>
            </div>
            <a 
              href={`tel:${serenata.clientPhone}`}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <IconPhone size={20} style={{ color: 'var(--fg-secondary)' }} />
              <span style={{ color: 'var(--fg)' }}>{serenata.clientPhone}</span>
            </a>
          </div>
        </div>

        {/* Location & Time */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>UBICACIÓN Y HORARIO</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <IconMapPin size={20} className="mt-0.5" style={{ color: 'var(--fg-muted)' }} />
              <div>
                <p style={{ color: 'var(--fg)' }}>{serenata.address}</p>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{serenata.comuna}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconCalendar size={20} style={{ color: 'var(--fg-muted)' }} />
              <span className="capitalize" style={{ color: 'var(--fg)' }}>{date}</span>
            </div>
            <div className="flex items-center gap-3">
              <IconClock size={20} style={{ color: 'var(--fg-muted)' }} />
              <span style={{ color: 'var(--fg)' }}>{time} ({serenata.duration} minutos)</span>
            </div>
          </div>
        </div>

        {/* Occasion & Message */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>DETALLES</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IconConfetti size={20} style={{ color: 'var(--fg-muted)' }} />
              <span style={{ color: 'var(--fg)' }}>{occasionLabels[serenata.occasion] || serenata.occasion}</span>
            </div>
            {serenata.message && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{serenata.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Required Instruments */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>INSTRUMENTOS REQUERIDOS</h2>
          <div className="flex flex-wrap gap-2">
            {serenata.requiredInstruments.map((inst) => (
              <span 
                key={inst}
                className="px-3 py-1 rounded-full text-sm"
                style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}
              >
                {inst}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {serenata.status === 'confirmed' && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting}
            className="serenatas-interactive w-full rounded-xl py-4 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'white' }}></div>
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
      </SerenatasPageShell>
    </div>
  );
}
