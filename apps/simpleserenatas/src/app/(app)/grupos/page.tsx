'use client';

import { useState, useEffect } from 'react';
import { 
    IconUsers, 
    IconPlus,
    IconMapPin,
    IconCalendar,
    IconCheck,
    IconClock,
    IconConfetti,
    IconSearch,
    IconFilter,
    IconTrendingUp
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

    useEffect(() => {
        const loadData = async () => {
            try {
                const [groupsRes, musiciansRes] = await Promise.all([
                    fetch(`${API_BASE}/api/serenatas/groups/my`, { credentials: 'include' }),
                    fetch(`${API_BASE}/api/serenatas/musicians/available?radius=10`, { credentials: 'include' }),
                ]);

                const groupsData = await groupsRes.json();
                const musiciansData = await musiciansRes.json();
                
                if (groupsData.ok && groupsData.groups) {
                    setMyGroups(groupsData.groups);
                }
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
    }, [showToast]);

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
                body: JSON.stringify({ name: newGroupName, date: newGroupDate }),
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Mis Grupos</h1>
                    <p style={{ color: 'var(--fg-muted)' }}>{myGroups.length} grupos activos</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconPlus size={20} />
                    Crear Grupo
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Groups */}
                <div className="lg:col-span-2 space-y-6">
                    {myGroups.length === 0 ? (
                        <div 
                            className="rounded-2xl p-8 text-center"
                            style={{ background: 'var(--bg-subtle)' }}
                        >
                            <IconUsers size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                            <p style={{ color: 'var(--fg-muted)' }}>No tienes grupos activos</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                Crea un grupo para organizar serenatas
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myGroups.map((group) => (
                                <Link
                                    key={group.id}
                                    href={`/grupo/${group.id}`}
                                    className="card card-hover block"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>{group.name}</h3>
                                            <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                                <IconCalendar size={14} />
                                                <span>{formatDate(group.date)}</span>
                                            </div>
                                        </div>
                                        <StatusBadge status={group.status} />
                                    </div>

                                    <div className="flex items-center gap-4 text-sm mb-4">
                                        <div className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            <IconUsers size={16} />
                                            <span>{group.members} músicos</span>
                                        </div>
                                        <div className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            <IconConfetti size={16} />
                                            <span>{group.serenatas} serenatas</span>
                                        </div>
                                    </div>

                                    <div 
                                        className="pt-3 border-t flex items-center justify-between"
                                        style={{ borderColor: 'var(--border)' }}
                                    >
                                        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            Capitán: {group.captainName}
                                        </span>
                                        <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                            {formatCurrency(group.totalEarnings)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="card">
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Resumen</h3>
                        <div className="space-y-4">
                            <div 
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--bg-subtle)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    <IconUsers size={20} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total grupos</p>
                                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{myGroups.length}</p>
                                </div>
                            </div>
                            <div 
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--bg-subtle)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'color-mix(in oklab, var(--success) 15%, transparent)' }}
                                >
                                    <IconTrendingUp size={20} style={{ color: 'var(--success)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ganancias totales</p>
                                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>
                                        {formatCurrency(myGroups.reduce((sum, g) => sum + g.totalEarnings, 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Available Musicians */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Músicos Cerca</h3>
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                                10km
                            </span>
                        </div>

                        {availableMusicians.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                                No hay músicos disponibles cerca
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {availableMusicians.slice(0, 5).map((musician) => (
                                    <div
                                        key={musician.id}
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'var(--bg-subtle)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ background: 'var(--accent-subtle)' }}
                                            >
                                                <IconConfetti size={18} style={{ color: 'var(--accent)' }} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{musician.name}</p>
                                                <p className="text-xs capitalize" style={{ color: 'var(--fg-muted)' }}>{musician.instrument}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{musician.distance} km</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                >
                    <div 
                        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ background: 'var(--surface)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Crear Nuevo Grupo</h2>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-full transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={24} />
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                    Nombre del grupo
                                </label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ej: Mariachi Domingo AM"
                                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2"
                                    style={{ 
                                        borderColor: 'var(--border)', 
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg)'
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={newGroupDate}
                                    onChange={(e) => setNewGroupDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2"
                                    style={{ 
                                        borderColor: 'var(--border)', 
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg)'
                                    }}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={!newGroupName || !newGroupDate}
                                    className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                                    style={{ 
                                        background: 'var(--accent)', 
                                        color: 'var(--accent-contrast)'
                                    }}
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

function StatusBadge({ status }: { status: string }) {
    const isConfirmed = status === 'confirmed';
    return (
        <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
                background: isConfirmed 
                    ? 'color-mix(in oklab, var(--success) 15%, transparent)'
                    : 'color-mix(in oklab, var(--warning) 15%, transparent)',
                color: isConfirmed ? 'var(--success)' : 'var(--warning)'
            }}
        >
            {isConfirmed ? <IconCheck size={12} /> : <IconClock size={12} />}
            {isConfirmed ? 'Confirmado' : 'Formando...'}
        </span>
    );
}

function IconX({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}
