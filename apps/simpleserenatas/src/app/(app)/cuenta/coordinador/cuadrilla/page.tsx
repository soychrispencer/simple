'use client';

import { useState, useEffect } from 'react';
import { 
  IconPlus,
  IconSearch,
  IconPhone,
  IconMusic,
  IconLoader,
  IconX
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { API_BASE as API_BASE_CONFIG } from '@simple/config';

const API_BASE = `${API_BASE_CONFIG}/api`;

interface Musician {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  instrument?: string;
  isActive: boolean;
}

export default function CuadrillaPage() {
  const { coordinatorProfile } = useAuth();
  const { showToast } = useToast();
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (coordinatorProfile) {
      loadCrew();
    }
  }, [coordinatorProfile]);

  const loadCrew = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/serenatas/coordinators/crew`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMusicians((data as unknown) as Musician[]);
      }
    } catch (error) {
      console.error('Error loading crew:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMusicians = musicians.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.instrument?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SerenatasPageShell fullWidth>
      <SerenatasPageHeader 
        title="Mi Cuadrilla"
        description="Tus músicos fijos"
      />
      
      <div className="p-4 space-y-4">
        {/* Search y Add */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar músico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2.5 rounded-xl text-white"
            style={{ background: 'var(--accent)' }}
          >
            <IconPlus size={20} />
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <IconLoader className="animate-spin" size={32} />
          </div>
        ) : filteredMusicians.length === 0 ? (
          <div className="text-center py-12">
            <IconMusic size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="font-medium mb-1">Tu cuadrilla está vacía</h3>
            <p className="text-sm text-gray-500 mb-4">Agrega músicos para armar grupos más rápido</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'var(--accent)' }}
            >
              Agregar Músico
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMusicians.map((musician) => (
              <div
                key={musician.id}
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ background: 'var(--accent)' }}
                >
                  {musician.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{musician.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {musician.instrument && (
                      <span className="flex items-center gap-1">
                        <IconMusic size={14} />
                        {musician.instrument}
                      </span>
                    )}
                    {musician.phone && (
                      <span className="flex items-center gap-1">
                        <IconPhone size={14} />
                        {musician.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${musician.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Agregar Músico</h3>
              <button onClick={() => setShowAddModal(false)}>
                <IconX size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Esta funcionalidad requiere buscar músicos registrados en la plataforma e invitarlos a tu cuadrilla.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full mt-4 py-3 rounded-xl text-white font-medium"
              style={{ background: 'var(--accent)' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </SerenatasPageShell>
  );
}
