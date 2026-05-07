'use client';

import { useState, useEffect } from 'react';
import {
    IconUsers,
    IconPlus,
    IconCalendar,
    IconCheck,
    IconClock,
    IconLoader2,
    IconX,
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
    members: number;
    serenatas: number;
    totalEarnings: number;
}

export default function GruposPage() {
    const { showToast } = useToast();
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDate, setNewGroupDate] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const groupsRes = await fetch(`${API_BASE}/api/serenatas/groups/my`, {
                    credentials: 'include',
                });
                const groupsData = await groupsRes.json().catch(() => ({}));

                if (groupsData.ok && groupsData.groups) {
                    setMyGroups(groupsData.groups);
                } else {
                    showToast(groupsData.error || 'No pudimos cargar tus grupos', 'error');
                }
            } catch {
                showToast('Error al cargar datos', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        void loadData();
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
        if (!newGroupName || !newGroupDate) {
            showToast('Completa nombre y fecha', 'error');
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newGroupName, date: newGroupDate }),
            });

            const data = await res.json();
            if (data.ok && data.group) {
                setMyGroups((prev) => [data.group, ...prev]);
                setShowCreateModal(false);
                setNewGroupName('');
                setNewGroupDate('');
                showToast('Grupo creado exitosamente', 'success');
            } else {
                showToast(data.error || 'Error al crear grupo', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <SerenatasPageShell width="default">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <>
        <SerenatasPageShell width="wide">
            <SerenatasPageHeader
                title="Mis grupos"
                description={`${myGroups.length} grupos`}
                trailing={
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="serenatas-interactive flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconPlus size={20} />
                        Crear grupo
                    </button>
                }
            />

            {myGroups.length === 0 ? (
                <div
                    className="rounded-2xl p-8 text-center"
                    style={{ background: 'var(--bg-subtle)' }}
                >
                    <IconUsers
                        size={48}
                        className="mx-auto mb-3"
                        style={{ color: 'var(--border-strong)' }}
                    />
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
                            href={`/grupos/${group.id}`}
                            className="card card-hover block"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                                        {group.name}
                                    </h3>
                                    <div
                                        className="flex items-center gap-2 text-sm mt-1"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        <IconCalendar size={14} />
                                        <span>{formatDate(group.date)}</span>
                                    </div>
                                </div>
                                <StatusBadge status={group.status} />
                            </div>

                            <div className="flex items-center gap-4 text-sm mb-4">
                                <div
                                    className="flex items-center gap-1"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    <IconUsers size={16} />
                                    <span>{group.members} músicos</span>
                                </div>
                                <div
                                    className="flex items-center gap-1"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    <IconCalendar size={16} />
                                    <span>{group.serenatas} serenatas</span>
                                </div>
                            </div>

                            <div
                                className="pt-3 border-t flex items-center justify-between"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Coordinador: {group.coordinatorName || 'Asignado'}
                                </span>
                                <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                    {formatCurrency(group.totalEarnings)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </SerenatasPageShell>

        {showCreateModal && (
            <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                style={{ background: 'color-mix(in oklab, var(--fg) 35%, transparent)' }}
            >
                <div
                    className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                    style={{ background: 'var(--surface)' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                            Crear Nuevo Grupo
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="p-2 rounded-full transition-colors hover:bg-[var(--bg-subtle)]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            <IconX size={24} />
                        </button>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleCreateGroup();
                        }}
                    >
                        <div>
                            <label
                                className="block text-sm font-medium mb-1"
                                style={{ color: 'var(--fg)' }}
                            >
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
                                    color: 'var(--fg)',
                                }}
                            />
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium mb-1"
                                style={{ color: 'var(--fg)' }}
                            >
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
                                    color: 'var(--fg)',
                                }}
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={!newGroupName || !newGroupDate || isCreating}
                                className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                }}
                            >
                                {isCreating ? (
                                    <>
                                        <IconLoader2 size={18} className="animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    'Crear Grupo'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
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
