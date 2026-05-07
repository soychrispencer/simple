'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  IconBell,
  IconPlus,
  IconCalendar,
  IconMapPin,
  IconChevronRight,
  IconLoader,
  IconWallet,
  IconUsersGroup
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { requestsApi } from '@/lib/api';
import { SerenatasPageShell } from '@/components/shell';

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  city?: string;
  eventDate: string;
  eventTime?: string;
  status: string;
  price?: number;
}

export default function CoordinadorDashboard() {
  const { user, coordinatorProfile } = useAuth();
  const [assigned, setAssigned] = useState<Serenata[]>([]);
  const [available, setAvailable] = useState<Serenata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Serenatas asignadas
      const assignedRes = await requestsApi.list({ assignedToMe: true });
      if (assignedRes.ok && assignedRes.data) {
        setAssigned(assignedRes.data.serenatas || []);
      }
      // Serenatas disponibles para pickup
      const availRes = await requestsApi.getAvailable();
      if (availRes.ok && availRes.data) {
        setAvailable(availRes.data.requests || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = assigned.filter(s => s.status === 'pending' || s.status === 'quoted').length;
  const todaySerenatas = assigned.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.eventDate === today;
  });

  if (!coordinatorProfile) {
    return (
      <SerenatasPageShell>
        <div className="p-4">
          <div className="text-center py-8">
            <h2 className="font-bold text-lg mb-2">Activa tu perfil de coordinador</h2>
            <p className="text-sm text-gray-500 mb-4">Completa tu perfil para empezar a recibir solicitudes</p>
            <Link 
              href="/cuenta/coordinador" 
              className="inline-block px-6 py-3 rounded-xl text-white font-medium"
              style={{ background: 'var(--accent)' }}
            >
              Completar perfil
            </Link>
          </div>
        </div>
      </SerenatasPageShell>
    );
  }

  return (
    <SerenatasPageShell fullWidth>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hola, {user?.name?.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500">Tienes {pendingCount} serenatas pendientes</p>
          </div>
          <Link href="/notificaciones" className="p-2 rounded-full bg-gray-100 relative">
            <IconBell size={20} />
            {pendingCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-green-50">
            <IconWallet size={24} className="text-green-600 mb-2" />
            <p className="text-2xl font-bold">{assigned.filter(s => s.status === 'completed').length}</p>
            <p className="text-xs text-gray-600">Completadas</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50">
            <IconCalendar size={24} className="text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{todaySerenatas.length}</p>
            <p className="text-xs text-gray-600">Hoy</p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/solicitudes"
            className="p-4 rounded-xl border text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <IconPlus size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Capturar Lead</span>
          </Link>
          <Link 
            href="/cuenta/coordinador"
            className="p-4 rounded-xl border text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <IconUsersGroup size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium">Mi Cuadrilla</span>
          </Link>
        </div>

        {/* Serenatas de hoy */}
        {todaySerenatas.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Serenatas de hoy</h2>
            <div className="space-y-3">
              {todaySerenatas.map((s) => (
                <Link 
                  key={s.id}
                  href={`/solicitudes/${s.id}`}
                  className="block p-4 rounded-xl border-l-4"
                  style={{ 
                    borderColor: 'var(--accent)',
                    background: 'var(--bg-elevated)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.clientName}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <IconMapPin size={14} />
                        <span>{s.city || s.address?.slice(0, 25)}...</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{s.eventTime}</p>
                      <IconChevronRight size={18} className="text-gray-400 inline" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Solicitudes disponibles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Solicitudes disponibles</h2>
            {available.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                {available.length} nuevas
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <IconLoader className="animate-spin" size={24} />
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">No hay solicitudes en tu zona</p>
            </div>
          ) : (
            <div className="space-y-3">
              {available.slice(0, 3).map((s) => (
                <Link 
                  key={s.id}
                  href={`/solicitudes/${s.id}`}
                  className="block p-4 rounded-xl border"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.clientName}</p>
                      <p className="text-sm text-gray-500">{s.city || s.address?.slice(0, 30)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.eventDate).toLocaleDateString('es-CL')} · {s.eventTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${s.price?.toLocaleString('es-CL')}</p>
                      <span className="text-xs text-gray-400">Ver detalle</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </SerenatasPageShell>
  );
}
