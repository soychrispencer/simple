'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    IconArrowLeft,
    IconCalendar,
    IconCheck,
    IconLoader2,
    IconMapPin,
    IconPlus,
    IconTrash,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

type GroupDetail = {
    id: string;
    name: string;
    date: string;
    status: string;
    coordinatorName?: string;
    members?: Array<{
        musicianId?: string;
        status?: string;
        role?: string;
        musician?: { instrument?: string; user?: { name?: string } };
    }>;
    assignments?: Array<{
        serenata?: { id?: string; clientName?: string; address?: string; eventTime?: string; status?: string };
    }>;
};

type CrewMember = { musicianId: string; name: string; instrument: string };
type GroupSerenata = {
    id?: string;
    clientName?: string;
    address?: string;
    eventTime?: string;
};

export default function GrupoDetailPage() {
    const params = useParams();
    const groupId = typeof params?.id === 'string' ? params.id : '';
    const { showToast } = useToast();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);
    const [available, setAvailable] = useState<CrewMember[]>([]);
    const [busy, setBusy] = useState<string | null>(null);

    const loadGroup = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups/${groupId}`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setGroup(data.group ?? null);
            } else {
                showToast(data?.error || 'No se pudo cargar el grupo', 'error');
                setGroup(null);
            }
        } finally {
            setLoading(false);
        }
    }, [groupId, showToast]);

    useEffect(() => {
        void loadGroup();
    }, [loadGroup]);

    const members = useMemo(() => {
        return (group?.members ?? []).map((m) => ({
            musicianId: m.musicianId ?? '',
            name: m.musician?.user?.name ?? 'Músico',
            instrument: m.musician?.instrument ?? m.role ?? 'instrumento',
            status: m.status ?? 'invited',
        }));
    }, [group]);

    const assignments = useMemo(() => {
        return (group?.assignments ?? [])
            .map((a) => a.serenata)
            .filter(Boolean) as GroupSerenata[];
    }, [group]);
    const isForming = group?.status === 'forming';
    const isConfirmed = group?.status === 'confirmed';

    const statusLabel = useMemo(() => {
        if (group?.status === 'forming') return 'Formando';
        if (group?.status === 'confirmed') return 'Confirmado';
        if (group?.status === 'active') return 'Activo';
        if (group?.status === 'completed') return 'Completado';
        return group?.status ?? 'Sin estado';
    }, [group?.status]);

    const loadAvailableCrew = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/coordinators/me/crew?status=active`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                showToast(data?.error || 'No se pudo cargar cuadrilla activa', 'error');
                return;
            }
            const existing = new Set(members.map((m) => m.musicianId));
            const mapped: CrewMember[] = (data.members ?? [])
                .map((m: any) => ({
                    musicianId: String(m.musicianId ?? ''),
                    name: m.name ?? m.email ?? 'Músico',
                    instrument: Array.isArray(m.instruments) && m.instruments.length > 0
                        ? m.instruments.join(', ')
                        : 'instrumento',
                }))
                .filter((m: CrewMember) => m.musicianId && !existing.has(m.musicianId));
            setAvailable(mapped);
            setShowPicker(true);
        } catch {
            showToast('Error al cargar cuadrilla', 'error');
        }
    };

    const addMember = async (musicianId: string) => {
        setBusy(`add-${musicianId}`);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups/${groupId}/members`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ musicianId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                if (res.status === 403) {
                    showToast('Este grupo pertenece a otro coordinador.', 'error');
                } else if (res.status === 409) {
                    showToast(
                        data?.error || 'Solo puedes agregar músicos cuando el grupo está en formación.',
                        'error'
                    );
                } else {
                    showToast(data?.error || 'No se pudo agregar', 'error');
                }
                return;
            }
            showToast('Músico agregado', 'success');
            setShowPicker(false);
            await loadGroup();
        } finally {
            setBusy(null);
        }
    };

    const removeMember = async (musicianId: string) => {
        if (!window.confirm('¿Quitar este músico del grupo?')) return;
        setBusy(`rm-${musicianId}`);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups/${groupId}/members/${musicianId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                if (res.status === 403) {
                    showToast('Este grupo pertenece a otro coordinador.', 'error');
                } else if (res.status === 409) {
                    showToast(
                        data?.error || 'Solo puedes quitar músicos cuando el grupo está en formación.',
                        'error'
                    );
                } else {
                    showToast(data?.error || 'No se pudo quitar', 'error');
                }
                return;
            }
            showToast('Músico removido', 'success');
            await loadGroup();
        } finally {
            setBusy(null);
        }
    };

    const confirmGroup = async () => {
        setBusy('confirm');
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups/${groupId}/confirm`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                if (res.status === 403) {
                    showToast('Este grupo pertenece a otro coordinador.', 'error');
                } else if (res.status === 409) {
                    showToast(data?.error || 'Este grupo ya no está en formación.', 'error');
                } else {
                    showToast(data?.error || 'No se pudo confirmar', 'error');
                }
                return;
            }
            showToast('Grupo confirmado', 'success');
            await loadGroup();
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return <SerenatasPageShell width="default">Cargando grupo…</SerenatasPageShell>;
    }
    if (!group) {
        return <SerenatasPageShell width="default">Grupo no encontrado.</SerenatasPageShell>;
    }

    return (
        <SerenatasPageShell width="default">
            <Link href="/grupos" className="mb-3 inline-flex items-center gap-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconArrowLeft size={16} /> Volver a grupos
            </Link>
            <SerenatasPageHeader
                title={group.name}
                description={`${members.length} músicos · ${assignments.length} serenatas`}
            />
            <div
                className="mb-4 flex items-center justify-between rounded-xl border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconCalendar size={14} />
                    {new Date(group.date).toLocaleDateString('es-CL', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                    })}
                </div>
                <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                        background: isConfirmed
                            ? 'color-mix(in oklab, var(--success) 14%, transparent)'
                            : 'var(--bg-subtle)',
                        color: isConfirmed ? 'var(--success)' : 'var(--fg)',
                    }}
                >
                    {statusLabel}
                </span>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                    className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: 'white' }}
                    onClick={loadAvailableCrew}
                    disabled={!isForming}
                >
                    <IconPlus size={16} className="inline mr-1" /> Agregar músico
                </button>
                <button
                    className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ background: 'var(--success)', color: 'white' }}
                    onClick={confirmGroup}
                    disabled={busy === 'confirm' || !isForming}
                >
                    {busy === 'confirm' ? (
                        <>
                            <IconLoader2 size={16} className="inline mr-1 animate-spin" />
                            Confirmando...
                        </>
                    ) : (
                        <>
                            <IconCheck size={16} className="inline mr-1" /> Confirmar grupo
                        </>
                    )}
                </button>
                <Link
                    href={`/mapa?groupId=${group.id}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-center"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                >
                    <IconMapPin size={16} className="inline mr-1" /> Abrir ruta
                </Link>
            </div>

            <section className="mb-4">
                <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    Integrantes del grupo
                </h2>
                {members.length === 0 ? (
                    <div
                        className="rounded-xl border p-5 text-center"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                    >
                        <IconUsers
                            size={24}
                            className="mx-auto mb-2"
                            style={{ color: 'var(--fg-muted)' }}
                        />
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Aún no agregas músicos al grupo.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {members.map((m) => (
                            <div
                                key={m.musicianId}
                                className="rounded-xl border p-3 flex items-center justify-between"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <div>
                                    <p style={{ color: 'var(--fg)' }}>{m.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {m.instrument}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeMember(m.musicianId)}
                                    disabled={busy === `rm-${m.musicianId}` || !isForming}
                                    style={{ color: 'var(--fg-muted)' }}
                                    title="Quitar del grupo"
                                >
                                    {busy === `rm-${m.musicianId}` ? (
                                        <IconLoader2 size={16} className="animate-spin" />
                                    ) : (
                                        <IconTrash size={16} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    Serenatas del grupo
                </h2>
                {assignments.length === 0 ? (
                    <div
                        className="rounded-xl border p-4 text-sm"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                        Este grupo todavía no tiene serenatas asignadas.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assignments.map((s, idx) => (
                            <div
                                key={s.id ?? `assignment-${idx}`}
                                className="rounded-xl border p-3"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                    {s.clientName ?? 'Cliente'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {s.address ?? 'Sin dirección'} {s.eventTime ? `· ${s.eventTime}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {showPicker && (
                <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-end sm:items-center justify-center">
                    <div className="w-full max-w-md rounded-xl p-4" style={{ background: 'var(--surface)' }}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>Agregar músico</p>
                            <button onClick={() => setShowPicker(false)}><IconX size={18} /></button>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-auto">
                            {available.map((m) => (
                                <button
                                    key={m.musicianId}
                                    className="w-full rounded-lg border p-3 text-left disabled:opacity-60"
                                    style={{ borderColor: 'var(--border)' }}
                                    onClick={() => addMember(m.musicianId)}
                                    disabled={busy === `add-${m.musicianId}`}
                                >
                                    <p style={{ color: 'var(--fg)' }}>{m.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{m.instrument}</p>
                                </button>
                            ))}
                            {available.length === 0 && <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No hay músicos activos disponibles.</p>}
                        </div>
                    </div>
                </div>
            )}
        </SerenatasPageShell>
    );
}

