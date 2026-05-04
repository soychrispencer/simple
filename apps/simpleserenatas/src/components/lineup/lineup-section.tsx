'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    IconCheck,
    IconPlus,
    IconUserPlus,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { useToast } from '@/hooks';

export interface LineupMember {
    id: string;
    musicianProfileId: string;
    status: 'invited' | 'requested' | 'accepted' | 'declined' | 'removed';
    initiator: 'coordinator' | 'musician' | null;
    invitedAt: string;
    respondedAt: string | null;
    confirmedAt: string | null;
    declineReason: string | null;
    attended: boolean | null;
    userId: string | null;
    instruments: string[] | null;
    name: string | null;
    email: string | null;
}

export interface CrewMember {
    /** Membresía cuadrilla (mismo valor que `crewMembershipId` si viene en la API). */
    id: string;
    crewMembershipId?: string;
    /** ID canónico del músico (`serenata_musicians`), para invitar al lineup */
    musicianId: string;
    name: string | null;
    email: string | null;
    instruments: string[] | null;
    membershipStatus: 'invited' | 'requested' | 'active' | 'declined' | 'removed';
}

const STATUS_BADGE: Record<LineupMember['status'], { label: string; tone: string }> = {
    invited: { label: 'Invitado', tone: 'var(--info)' },
    requested: { label: 'Solicitando', tone: 'var(--warning)' },
    accepted: { label: 'Aceptado', tone: 'var(--success)' },
    declined: { label: 'Rechazado', tone: 'var(--fg-muted)' },
    removed: { label: 'Removido', tone: 'var(--fg-muted)' },
};

interface Props {
    serenataId: string;
    /** Solo el coordinador asignado puede gestionar el lineup. */
    canManage: boolean;
}

/**
 * Sección de gestión del lineup de una serenata: ver miembros, invitar de la cuadrilla,
 * aprobar/rechazar solicitudes y remover. Visible para coord asignado, miembros del lineup y admin.
 */
export function LineupSection({ serenataId, canManage }: Props) {
    const { showToast } = useToast();
    const [lineup, setLineup] = useState<LineupMember[]>([]);
    const [crew, setCrew] = useState<CrewMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/${serenataId}/lineup`,
                { credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setLineup(data.lineup ?? []);
            }
        } catch (err) {
            console.error('[LineupSection] refresh error', err);
        } finally {
            setIsLoading(false);
        }
    }, [serenataId]);

    const loadCrew = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/me/crew?status=active`,
                { credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setCrew(data.members ?? []);
            }
        } catch (err) {
            console.error('[LineupSection] crew load error', err);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (showInvite && crew.length === 0) {
            void loadCrew();
        }
    }, [showInvite, crew.length, loadCrew]);

    const alreadyInLineupIds = new Set(
        lineup.filter((m) => ['invited', 'requested', 'accepted'].includes(m.status))
            .map((m) => m.musicianProfileId)
    );
    const invitableCrew = crew.filter((m) => !alreadyInLineupIds.has(m.musicianId));

    const handleInvite = async () => {
        if (selectedIds.length === 0) return;
        setBusyId('__invite__');
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/${serenataId}/lineup/invite`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ musicianIds: selectedIds }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast(
                    `Invitados ${data.invited ?? selectedIds.length} músico(s)`,
                    'success'
                );
                setSelectedIds([]);
                setShowInvite(false);
                await refresh();
            } else {
                showToast(data?.error || 'Error al invitar', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const handleDecision = async (lineupId: string, approve: boolean) => {
        setBusyId(lineupId);
        try {
            const reason = approve ? undefined : window.prompt('Motivo (opcional):') ?? undefined;
            const res = await fetch(
                `${API_BASE}/api/serenatas/${serenataId}/lineup/${lineupId}/decision`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ approve, reason }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast(approve ? 'Solicitud aceptada' : 'Solicitud rechazada', 'success');
                await refresh();
            } else {
                showToast(data?.error || 'Error', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const handleRemove = async (lineupId: string) => {
        if (!confirm('¿Remover este músico del lineup?')) return;
        setBusyId(lineupId);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/${serenataId}/lineup/${lineupId}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast('Músico removido del lineup', 'success');
                await refresh();
            } else {
                showToast(data?.error || 'Error', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const toggleSelected = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    return (
        <section
            className="rounded-xl p-5 border space-y-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <IconUsers size={20} style={{ color: 'var(--accent)' }} />
                    <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
                        Lineup de músicos
                    </h2>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={() => setShowInvite((v) => !v)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconUserPlus size={16} />
                        Invitar
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                    Cargando lineup…
                </div>
            ) : lineup.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Aún no hay músicos en el lineup. Invita músicos de tu cuadrilla.
                </p>
            ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {lineup.map((m) => {
                        const badge = STATUS_BADGE[m.status];
                        return (
                            <li
                                key={m.id}
                                className="py-3 flex items-center justify-between gap-3 flex-wrap"
                            >
                                <div className="min-w-0">
                                    <p
                                        className="font-medium truncate"
                                        style={{ color: 'var(--fg)' }}
                                    >
                                        {m.name ?? m.email ?? 'Músico'}
                                    </p>
                                    <p
                                        className="text-xs"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        {(m.instruments ?? []).join(', ') || 'sin instrumentos'}
                                        {m.declineReason ? ` · ${m.declineReason}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-xs font-medium px-2 py-1 rounded"
                                        style={{
                                            background: 'color-mix(in oklab, var(--surface) 70%, transparent)',
                                            color: badge.tone,
                                            border: `1px solid ${badge.tone}`,
                                        }}
                                    >
                                        {badge.label}
                                    </span>

                                    {canManage && m.status === 'requested' && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={busyId === m.id}
                                                onClick={() => handleDecision(m.id, true)}
                                                className="p-1.5 rounded-lg disabled:opacity-50"
                                                style={{
                                                    background: 'var(--success)',
                                                    color: 'var(--accent-contrast)',
                                                }}
                                                title="Aceptar"
                                            >
                                                <IconCheck size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === m.id}
                                                onClick={() => handleDecision(m.id, false)}
                                                className="p-1.5 rounded-lg disabled:opacity-50"
                                                style={{
                                                    background: 'var(--bg-subtle)',
                                                    color: 'var(--fg-secondary)',
                                                }}
                                                title="Rechazar"
                                            >
                                                <IconX size={14} />
                                            </button>
                                        </>
                                    )}

                                    {canManage && ['invited', 'accepted'].includes(m.status) && (
                                        <button
                                            type="button"
                                            disabled={busyId === m.id}
                                            onClick={() => handleRemove(m.id)}
                                            className="p-1.5 rounded-lg disabled:opacity-50"
                                            style={{
                                                background: 'var(--bg-subtle)',
                                                color: 'var(--fg-muted)',
                                            }}
                                            title="Remover del lineup"
                                        >
                                            <IconX size={14} />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {canManage && showInvite && (
                <div
                    className="mt-3 rounded-lg p-3 border"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
                >
                    <p
                        className="text-sm font-medium mb-2"
                        style={{ color: 'var(--fg)' }}
                    >
                        Selecciona músicos de tu cuadrilla
                    </p>
                    {invitableCrew.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            No hay músicos activos en tu cuadrilla disponibles.{' '}
                            <a href="/cuadrilla" className="underline">
                                Gestionar cuadrilla
                            </a>
                        </p>
                    ) : (
                        <ul className="space-y-1 mb-3 max-h-60 overflow-y-auto">
                            {invitableCrew.map((m) => (
                                <li key={m.id}>
                                    <label className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--surface)]">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(m.musicianId)}
                                            onChange={() => toggleSelected(m.musicianId)}
                                        />
                                        <span style={{ color: 'var(--fg)' }}>
                                            {m.name ?? m.email}
                                        </span>
                                        <span
                                            className="text-xs"
                                            style={{ color: 'var(--fg-muted)' }}
                                        >
                                            {(m.instruments ?? []).join(', ')}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={selectedIds.length === 0 || busyId === '__invite__'}
                            onClick={handleInvite}
                            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--accent-contrast)',
                            }}
                        >
                            <IconPlus size={16} />
                            {busyId === '__invite__'
                                ? 'Enviando…'
                                : `Invitar (${selectedIds.length})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowInvite(false);
                                setSelectedIds([]);
                            }}
                            className="px-4 py-2 rounded-lg text-sm border"
                            style={{
                                borderColor: 'var(--border)',
                                color: 'var(--fg-secondary)',
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
