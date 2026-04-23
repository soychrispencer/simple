'use client';

import { useState, useEffect } from 'react';
import { 
  IconUsers, 
  IconPlus,
  IconMapPin,
  IconCalendar,
  IconCheck,
  IconClock,
  IconMusic
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';

interface Group {
  id: string;
  name: string;
  date: string;
  status: string;
  captainName: string;
  members: number;
  serenatas: number;
  totalEarnings: number;
}

interface Musician {
  id: string;
  name: string;
  instrument: string;
  distance: number;
}

export default function GruposPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [availableMusicians, setAvailableMusicians] = useState<Musician[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDate, setNewGroupDate] = useState('');

  // Load groups and available musicians
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load my groups
        const groupsRes = await fetch(`${API_BASE}/api/serenatas/groups/my`, {
          credentials: 'include',
        });
        const groupsData = await groupsRes.json();
        
        if (groupsData.ok && groupsData.groups) {
          setMyGroups(groupsData.groups);
        }

        // Load available musicians nearby
        const musiciansRes = await fetch(`${API_BASE}/api/serenatas/musicians/available?radius=10`, {
          credentials: 'include',
        });
        const musiciansData = await musiciansRes.json();
        
        if (musiciansData.ok && musiciansData.musicians) {
          setAvailableMusicians(musiciansData.musicians);
        }
      } catch {
        showToast('Error al cargar datos', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName || !newGroupDate) return;

    try {
      const res = await fetch(`${API_BASE}/api/serenatas/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName,
          date: newGroupDate,
        }),
      });

      const data = await res.json();
      if (data.ok && data.group) {
        setMyGroups([...myGroups, data.group]);
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDate('');
        showToast('Grupo creado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al crear grupo', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
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
      {/* Create Group Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full bg-zinc-900 text-white rounded-xl p-4 font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
      >
        <IconPlus size={20} />
        Crear Nuevo Grupo
      </button>

      {/* My Groups */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3">Mis Grupos</h2>
        
        {myGroups.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl p-8 text-center">
            <IconUsers size={48} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">No tienes grupos activos</p>
            <p className="text-sm text-zinc-400 mt-1">Crea un grupo para organizar serenatas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myGroups.map((group) => (
              <Link
                key={group.id}
                href={`/grupo/${group.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-zinc-100 hover:border-rose-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{group.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                      <IconCalendar size={14} />
                      <span>{formatDate(group.date)}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    group.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {group.status === 'confirmed' ? (
                      <><IconCheck size={12} className="mr-1" /> Confirmado</>
                    ) : (
                      'Formando...'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-zinc-600">
                    <IconUsers size={16} />
                    <span>{group.members} músicos</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-600">
                    <IconMusic size={16} />
                    <span>{group.serenatas} serenatas</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-sm text-zinc-500">
                    Capitán: {group.captainName}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {formatCurrency(group.totalEarnings)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Available Musicians */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-zinc-900">Músicos Disponibles</h2>
          <button className="text-sm text-rose-600 font-medium hover:text-rose-700">
            Ver todos
          </button>
        </div>

        <div className="space-y-2">
          {availableMusicians.map((musician) => (
            <div
              key={musician.id}
              className="flex items-center justify-between bg-white rounded-xl p-3 border border-zinc-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                  <IconMusic size={18} className="text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{musician.name}</p>
                  <p className="text-sm text-zinc-500 capitalize">{musician.instrument}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">{musician.distance} km</span>
                <button className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors">
                  Invitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Group Modal - Simplified */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900">Crear Nuevo Grupo</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-full"
              >
                <IconX size={24} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Mariachi Domingo AM"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={newGroupDate}
                  onChange={(e) => setNewGroupDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!newGroupName || !newGroupDate}
                  className="w-full bg-rose-500 text-white rounded-xl py-3 font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// IconX component needed for the modal
function IconX({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
