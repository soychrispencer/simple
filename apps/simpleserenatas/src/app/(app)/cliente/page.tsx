'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  IconPlus, 
  IconCalendar, 
  IconChevronRight,
  IconMusic,
  IconClock,
  IconMapPin,
  IconLoader,
  IconBell
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { SerenatasPageShell } from '@/components/shell';
import { requestsApi } from '@/lib/api';

interface Serenata {
  id: string;
  recipientName: string;
  address: string;
  city?: string;
  eventDate: string;
  eventTime?: string;
  status: 'pending' | 'quoted' | 'accepted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  coordinatorName?: string;
}

const statusConfig = {
  pending: { label: 'Buscando coordinador', color: '#f59e0b', bg: '#fef3c7' },
  quoted: { label: 'Cotización recibida', color: '#3b82f6', bg: '#dbeafe' },
  accepted: { label: 'Aceptada', color: '#10b981', bg: '#d1fae5' },
  confirmed: { label: 'Confirmada', color: '#10b981', bg: '#d1fae5' },
  in_progress: { label: 'En camino', color: '#ef4444', bg: '#fee2e2' },
  completed: { label: 'Completada', color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelada', color: '#6b7280', bg: '#f3f4f6' },
};

export default function ClienteDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [serenatas, setSerenatas] = useState<Serenata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSerenatas();
  }, []);

  const loadSerenatas = async () => {
    try {
      setLoading(true);
      const res = await requestsApi.list();
      if (res.ok && res.data) {
        setSerenatas(res.data.serenatas || []);
      }
    } catch (error) {
      console.error('Error loading serenatas:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeSerenatas = serenatas.filter(s => 
    ['pending', 'quoted', 'accepted', 'confirmed', 'in_progress'].includes(s.status)
  );

  return (
    <SerenatasPageShell fullWidth>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hola, {user?.name?.split(' ')[0] || 'Invitado'}</h1>
            <p className="text-sm text-gray-500">¿Quieres organizar una serenata?</p>
          </div>
          <Link 
            href="/notificaciones" 
            className="p-2 rounded-full bg-gray-100 relative"
          >
            <IconBell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </Link>
        </div>

        {/* CTA Principal */}
        <Link 
          href="/solicitar"
          className="block w-full py-4 px-6 rounded-2xl font-semibold text-white text-center"
          style={{ background: 'var(--accent)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <IconPlus size={20} />
            <span>Solicitar Serenata</span>
          </div>
        </Link>

        {/* Mis Serenatas Activas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Mis Serenatas</h2>
            <Link href="/cliente/serenatas" className="text-sm" style={{ color: 'var(--accent)' }}>
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <IconLoader className="animate-spin" size={24} />
            </div>
          ) : activeSerenatas.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <IconMusic size={40} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">No tienes serenatas activas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSerenatas.slice(0, 3).map((serenata) => (
                <Link 
                  key={serenata.id}
                  href={`/serenata/${serenata.id}`}
                  className="block p-4 rounded-xl border"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{serenata.recipientName || 'Sin destinatario'}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <IconMapPin size={14} />
                        <span>{serenata.city || serenata.address?.slice(0, 30)}...</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <IconCalendar size={14} />
                        <span>{new Date(serenata.eventDate).toLocaleDateString('es-CL')}</span>
                        <IconClock size={14} className="ml-2" />
                        <span>{serenata.eventTime}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          background: statusConfig[serenata.status]?.bg,
                          color: statusConfig[serenata.status]?.color
                        }}
                      >
                        {statusConfig[serenata.status]?.label}
                      </span>
                      <IconChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="p-4 rounded-xl bg-blue-50">
          <h3 className="font-medium text-sm mb-1">¿Consejo?</h3>
          <p className="text-xs text-gray-600">
            Reserva con al menos 48h de anticipación para mayor disponibilidad.
          </p>
        </div>
      </div>
    </SerenatasPageShell>
  );
}
