'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconCalendar,
  IconCheck,
  IconArrowLeft,
  IconMapPin,
  IconConfetti,
  IconClock,
  IconUser,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconX
} from '@tabler/icons-react';
import Link from 'next/link';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Group {
  id: string;
  name: string;
  date: string;
  status: string;
  coordinatorName?: string;
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

const statusLabels: Record<string, { label: string; bg: string; fg: string }> = {
  forming: {
    label: 'Formando',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--warning) 25%)',
    fg: 'var(--warning)',
  },
  confirmed: {
    label: 'Confirmado',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
    fg: 'var(--success)',
  },
  active: {
    label: 'Activo',
    bg: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)',
    fg: 'var(--info)',
  },
  completed: {
    label: 'Completado',
    bg: 'var(--bg-subtle)',
    fg: 'var(--fg-secondary)',
  },
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--fg-secondary)' }}>Grupo no encontrado</p>
          <Link href="/grupos" className="font-medium" style={{ color: 'var(--accent)' }}>
            Volver a grupos
          </Link>
        </div>
      </div>
    );
  }

  const status = statusLabels[group.status] || { label: group.status, bg: 'var(--bg-subtle)', fg: 'var(--fg-secondary)' };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/grupos"
            className="serenatas-interactive shrink-0 rounded-full p-2 transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            <IconArrowLeft size={24} />
          </Link>
          <SerenatasPageHeader title={group.name} className="min-w-0 !mb-0 flex-1" />
        </div>
      </div>

      <SerenatasPageShell width="default" className="space-y-4">
        {/* Status Banner */}
        <div className="rounded-xl p-4" style={{ background: status.bg, color: status.fg }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">{status.label}</span>
            <span className="text-lg font-bold">{formatCurrency(group.totalEarnings)}</span>
          </div>
          {/* Action Buttons */}
          {group.status === 'forming' && (
            <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'color-mix(in oklab, currentColor 25%, transparent)' }}>
              <button
                onClick={handleConfirmGroup}
                disabled={isConfirming}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
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
              className="flex items-center justify-center gap-2 mt-3 pt-3 border-t font-medium"
              style={{ borderColor: 'color-mix(in oklab, currentColor 25%, transparent)' }}
            >
              <IconMapPin className="w-4 h-4" />
              Ver Ruta del Grupo
            </Link>
          )}
        </div>

        {/* Date */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
              <IconCalendar size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold capitalize" style={{ color: 'var(--fg)' }}>{formatDate(group.date)}</p>
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Fecha del grupo</p>
            </div>
          </div>
        </div>

        {/* Coordinator */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-secondary)' }}>COORDINADOR DEL GRUPO</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
              <IconUser size={24} style={{ color: 'var(--fg-muted)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--fg)' }}>{group.coordinatorName || 'Sin asignar'}</p>
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Responsable de la coordinación</p>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>INTEGRANTES</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{group.members.length} músicos</span>
              {group.status === 'forming' && (
                <button
                  onClick={openAddMemberModal}
                  className="p-1 rounded-full transition-colors"
                  style={{ color: 'var(--fg-secondary)' }}
                  title="Agregar miembro"
                >
                  <IconPlus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                    <IconConfetti size={18} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{member.name}</p>
                    <p className="text-sm capitalize" style={{ color: 'var(--fg-secondary)' }}>{member.instrument}</p>
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
                      className="p-1 rounded-full transition-colors"
                      style={{ color: 'var(--error)' }}
                      title="Remover miembro"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'color-mix(in oklab, var(--fg) 35%, transparent)' }}>
            <div className="rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Agregar Miembro</h2>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="p-2 rounded-full"
                >
                  <IconX className="w-5 h-5" style={{ color: 'var(--fg-secondary)' }} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {availableMusicians.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'var(--fg-secondary)' }}>
                    No hay músicos disponibles para agregar
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableMusicians.map((musician) => (
                      <button
                        key={musician.id}
                        onClick={() => handleAddMember(musician.id)}
                        disabled={isAddingMember}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left disabled:opacity-50"
                        style={{ background: 'var(--bg-subtle)' }}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                          <IconConfetti className="w-5 h-5" style={{ color: 'var(--fg-muted)' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'var(--fg)' }}>{musician.name}</p>
                          <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{musician.instrument}</p>
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
        <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>SERENATAS ASIGNADAS</h2>
            <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{group.serenatas.length} serenatas</span>
          </div>
          <div className="space-y-3">
            {group.serenatas.map((serenata) => (
              <Link
                key={serenata.id}
                href={`/serenata/${serenata.id}`}
                className="block p-3 rounded-lg transition-colors"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{serenata.clientName}</p>
                    <div className="flex items-center gap-1 text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                      <IconMapPin size={14} />
                      <span className="truncate">{serenata.address}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                      <IconClock size={14} />
                      <span>{formatTime(serenata.dateTime)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{formatCurrency(serenata.price)}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={
                        serenata.status === 'confirmed'
                          ? { background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)', color: 'var(--success)' }
                          : serenata.status === 'completed'
                          ? { background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }
                          : { background: 'color-mix(in oklab, var(--surface) 75%, var(--warning) 25%)', color: 'var(--warning)' }
                      }
                    >
                      {serenata.status === 'confirmed' ? 'Confirmada' : 
                       serenata.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SerenatasPageShell>
    </div>
  );
}
