'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  IconMusic,
  IconChevronRight,
  IconLoader,
  IconFilter,
  IconCalendar
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { requestsApi } from '@/lib/api';

interface Serenata {
  id: string;
  recipientName: string;
  address: string;
  city?: string;
  eventDate: string;
  eventTime?: string;
  status: string;
  price?: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
  quoted: { label: 'Cotizada', color: '#3b82f6', bg: '#dbeafe' },
  accepted: { label: 'Aceptada', color: '#10b981', bg: '#d1fae5' },
  confirmed: { label: 'Confirmada', color: '#10b981', bg: '#d1fae5' },
  in_progress: { label: 'En camino', color: '#ef4444', bg: '#fee2e2' },
  completed: { label: 'Completada', color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelada', color: '#6b7280', bg: '#f3f4f6' },
};

export default function ClienteSerenatasPage() {
  const { user } = useAuth();
  const [serenatas, setSerenatas] = useState<Serenata[]>([]);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSerenatas();
  }, []);

  const loadSerenatas = async () => {
    try {
      setLoading(true);
      const res = await requestsApi.list();
      if (res.ok && res.data) {
        setSerenatas(((res.data.serenatas || []) as unknown) as Serenata[]);
      }
    } catch (error) {
      console.error('Error loading serenatas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSerenatas = serenatas.filter(s => {
    if (filter === 'active') return ['pending', 'quoted', 'accepted', 'confirmed', 'in_progress'].includes(s.status);
    if (filter === 'completed') return ['completed', 'cancelled'].includes(s.status);
    return true;
  });

  return (
    <SerenatasPageShell fullWidth>
      <SerenatasPageHeader 
        title="Mis Serenatas"
        description={user?.name || ''}
      />
      
      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="flex gap-2">
          {(['active', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? 'text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
              style={filter === f ? { background: 'var(--accent)' } : {}}
            >
              {f === 'active' ? 'Activas' : f === 'completed' ? 'Completadas' : 'Todas'}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <IconLoader className="animate-spin" size={32} />
          </div>
        ) : filteredSerenatas.length === 0 ? (
          <div className="text-center py-12">
            <IconMusic size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="font-medium text-gray-900 mb-1">
              {filter === 'active' ? 'No tienes serenatas activas' : 'No hay serenatas'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {filter === 'active' 
                ? '¿Quieres organizar una serenata?' 
                : 'Tu historial está vacío'}
            </p>
            <Link 
              href="/solicitar"
              className="inline-block px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'var(--accent)' }}
            >
              Solicitar Serenata
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSerenatas.map((serenata) => (
              <Link 
                key={serenata.id}
                href={`/serenata/${serenata.id}`}
                className="block p-4 rounded-xl border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{serenata.recipientName || 'Sin destinatario'}</h3>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ 
                          background: statusConfig[serenata.status]?.bg,
                          color: statusConfig[serenata.status]?.color
                        }}
                      >
                        {statusConfig[serenata.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{serenata.city || serenata.address}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <IconCalendar size={12} />
                        {new Date(serenata.eventDate).toLocaleDateString('es-CL')}
                      </span>
                      <span>{serenata.eventTime}</span>
                      {serenata.price && (
                        <span className="font-medium text-gray-600">
                          ${serenata.price?.toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>
                  <IconChevronRight size={20} className="text-gray-400 flex-shrink-0 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SerenatasPageShell>
  );
}
