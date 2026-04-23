'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconUsers, 
  IconCalendar,
  IconCheck,
  IconArrowLeft,
  IconCurrencyDollar,
  IconMapPin,
  IconMusic,
  IconClock,
  IconUser,
  IconPlus,
  IconTrash,
  IconPlayerPlay,
  IconFlag,
  IconLoader2,
  IconX
} from '@tabler/icons-react';
import Link from 'next/link';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';

interface Group {
  id: string;
  name: string;
  date: string;
  status: string;
  captainName: string;
  members: Member[];
  serenatas: Serenata[];
  totalEarnings: string;
}

interface Member {
  id: string;
  name: string;
  instrument: string;
  status: string;
  earnings: string;
}

interface Serenata {
  id: string;
  clientName: string;
  address: string;
  dateTime: string;
  price: string;
  status: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  forming: { label: 'Formando', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
  active: { label: 'Activo', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completado', color: 'bg-zinc-100 text-zinc-800' },
};

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMusicians, setAvailableMusicians] = useState<Member[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/groups/${params.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.ok && data.group) {
          setGroup(data.group);
        }
      } catch {
        showToast('Error al cargar el grupo', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const loadRoute = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/serenatas/routes/group/${params.id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok && data.route) {
          setRouteId(data.route.id);
        }
      } catch {
        // Route might not exist yet
      }
    };

    loadGroup();
    loadRoute();
  }, [params.id, showToast]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(parseInt(amount || '0'));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const handleConfirmGroup = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/groups/${params.id}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setGroup(prev => prev ? { ...prev, status: 'confirmed' } : null);
        showToast('Grupo confirmado exitosamente', 'success');
      } else {
        showToast(data.error || 'Error al confirmar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAddMember = async (musicianId: string) => {
    setIsAddingMember(true);
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/groups/${params.id}/members`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicianId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Miembro agregado', 'success');
        setShowAddMemberModal(false);
        // Reload group
        const groupRes = await fetch(`${API_BASE}/api/serenatas/groups/${params.id}`, {
          credentials: 'include',
        });
        const groupData = await groupRes.json();
        if (groupData.ok) setGroup(groupData.group);
      } else {
        showToast(data.error || 'Error al agregar', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de remover este miembro?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/groups/${params.id}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Miembro removido', 'success');
        setGroup(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : null);
      } else {
        showToast(data.error || 'Error al remover', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const loadAvailableMusicians = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/serenatas/musicians?available=true`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.musicians) {
        // Filter out already added members
        const existingIds = new Set(group?.members.map(m => m.id) || []);
        setAvailableMusicians(data.musicians.filter((m: Member) => !existingIds.has(m.id)));
      }
    } catch {
      showToast('Error al cargar músicos', 'error');
    }
  };

  const openAddMemberModal = () => {
    loadAvailableMusicians();
    setShowAddMemberModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Grupo no encontrado</p>
          <Link href="/grupos" className="text-rose-600 font-medium">
            Volver a grupos
          </Link>
        </div>
      </div>
    );
  }

  const status = statusLabels[group.status] || { label: group.status, color: 'bg-zinc-100' };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-zinc-200">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link 
            href="/grupos" 
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <IconArrowLeft size={24} className="text-zinc-700" />
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">{group.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-xl p-4 ${status.color}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">{status.label}</span>
            <span className="text-lg font-bold">{formatCurrency(group.totalEarnings)}</span>
          </div>
          {/* Action Buttons */}
          {group.status === 'forming' && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-200/50">
              <button
                onClick={handleConfirmGroup}
                disabled={isConfirming}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isConfirming ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconCheck className="w-4 h-4" />
                )}
                Confirmar Grupo
              </button>
            </div>
          )}
          {routeId && (
            <Link
              href={`/ruta/${routeId}`}
              className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-zinc-200/50 text-blue-600 font-medium hover:text-blue-700"
            >
              <IconMapPin className="w-4 h-4" />
              Ver Ruta del Grupo
            </Link>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
              <IconCalendar size={20} className="text-rose-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 capitalize">{formatDate(group.date)}</p>
              <p className="text-sm text-zinc-500">Fecha del grupo</p>
            </div>
          </div>
        </div>

        {/* Captain */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500 mb-3">CAPITÁN DEL GRUPO</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center">
              <IconUser size={24} className="text-zinc-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">{group.captainName}</p>
              <p className="text-sm text-zinc-500">Responsable del grupo</p>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-500">INTEGRANTES</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{group.members.length} músicos</span>
              {group.status === 'forming' && (
                <button
                  onClick={openAddMemberModal}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                  title="Agregar miembro"
                >
                  <IconPlus className="w-5 h-5 text-zinc-600" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                    <IconMusic size={18} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">{member.name}</p>
                    <p className="text-sm text-zinc-500 capitalize">{member.instrument}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    member.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {member.status === 'confirmed' ? 'Confirmado' : 'Invitado'}
                  </span>
                  {group.status === 'forming' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      title="Remover miembro"
                    >
                      <IconTrash className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="font-semibold text-zinc-900">Agregar Miembro</h2>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full"
                >
                  <IconX className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {availableMusicians.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">
                    No hay músicos disponibles para agregar
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableMusicians.map((musician) => (
                      <button
                        key={musician.id}
                        onClick={() => handleAddMember(musician.id)}
                        disabled={isAddingMember}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                          <IconMusic className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900">{musician.name}</p>
                          <p className="text-sm text-zinc-500">{musician.instrument}</p>
                        </div>
                        {isAddingMember ? (
                          <IconLoader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                          <IconPlus className="w-5 h-5 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Serenatas */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-500">SERENATAS ASIGNADAS</h2>
            <span className="text-sm text-zinc-500">{group.serenatas.length} serenatas</span>
          </div>
          <div className="space-y-3">
            {group.serenatas.map((serenata) => (
              <Link
                key={serenata.id}
                href={`/serenata/${serenata.id}`}
                className="block p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{serenata.clientName}</p>
                    <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                      <IconMapPin size={14} />
                      <span className="truncate">{serenata.address}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                      <IconClock size={14} />
                      <span>{formatTime(serenata.dateTime)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-zinc-900">{formatCurrency(serenata.price)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      serenata.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : serenata.status === 'completed'
                        ? 'bg-zinc-100 text-zinc-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {serenata.status === 'confirmed' ? 'Confirmada' : 
                       serenata.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
