'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    IconCheck,
    IconMicrophone,
    IconPlus,
    IconSend,
    IconTrash,
    IconUser,
    IconUserPlus,
    IconX,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { useToast } from '@/hooks';

interface CrewMember {
    /** Igual que `crewMembershipId` cuando la API envía ambos campos. */
    id: string;
    crewMembershipId?: string;
    userId: string;
    name: string | null;
    email: string | null;
    instruments: string[] | null;
    bio: string | null;
    phone: string | null;
    isActive: boolean;
    membershipStatus: 'active' | 'invited' | 'requested' | 'declined' | 'removed';
    membershipInitiator: 'coordinator' | 'musician' | null;
    membershipInvitedAt: string | null;
    membershipMessage: string | null;
}

const INSTRUMENT_OPTIONS = [
    'voz', 'guitarra', 'guitarrón', 'vihuela', 'violín', 'trompeta',
    'saxofón', 'bajo', 'piano', 'batería', 'teclado', 'percusión',
    'charango', 'cuatro', 'acordeón',
];

const STATUS_BADGE: Record<CrewMember['membershipStatus'], { label: string; tone: string }> = {
    active: { label: 'Activo', tone: 'var(--success)' },
    invited: { label: 'Invitado', tone: 'var(--info)' },
    requested: { label: 'Solicita unirse', tone: 'var(--warning)' },
    declined: { label: 'Rechazado', tone: 'var(--fg-muted)' },
    removed: { label: 'Removido', tone: 'var(--fg-muted)' },
};

export default function CuadrillaPage() {
    const { showToast } = useToast();
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Form state
    const [formEmail, setFormEmail] = useState('');
    const [formInstruments, setFormInstruments] = useState<string[]>([]);
    const [formMessage, setFormMessage] = useState('');

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/me/crew`,
                { credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setMembers(data.members ?? []);
            } else {
                if (res.status !== 404) {
                    showToast(data?.error || 'Error al cargar cuadrilla', 'error');
                }
                setMembers([]);
            }
        } catch (err) {
            console.error('[cuadrilla] load error', err);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const grouped = useMemo(() => {
        return {
            pendingRequests: members.filter((m) => m.membershipStatus === 'requested'),
            invited: members.filter((m) => m.membershipStatus === 'invited'),
            active: members.filter((m) => m.membershipStatus === 'active'),
            inactive: members.filter((m) =>
                ['declined', 'removed'].includes(m.membershipStatus)
            ),
        };
    }, [members]);

    const handleInvite = async () => {
        const email = formEmail.trim().toLowerCase();
        if (!email) {
            showToast('Ingresa el email del músico', 'error');
            return;
        }
        setBusyId('__invite__');
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/me/crew/invite`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        email,
                        instruments: formInstruments,
                        message: formMessage.trim() || undefined,
                    }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast('Invitación enviada', 'success');
                setFormEmail('');
                setFormInstruments([]);
                setFormMessage('');
                setShowInviteForm(false);
                await refresh();
            } else {
                showToast(data?.error || 'No pudimos enviar la invitación', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const handleDecision = async (profileId: string, approve: boolean) => {
        setBusyId(profileId);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/me/crew/${profileId}/decision`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ approve }),
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

    const handleRemove = async (profileId: string) => {
        if (!confirm('¿Remover a este músico de tu cuadrilla?')) return;
        setBusyId(profileId);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/me/crew/${profileId}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast('Músico removido de la cuadrilla', 'success');
                await refresh();
            } else {
                showToast(data?.error || 'Error', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const toggleInstrument = (inst: string) => {
        setFormInstruments((prev) =>
            prev.includes(inst) ? prev.filter((x) => x !== inst) : [...prev, inst]
        );
    };

    const totalCount = grouped.active.length + grouped.invited.length + grouped.pendingRequests.length;

    return (
        <SerenatasPageShell width="default">
            <SerenatasPageHeader
                title="Mi cuadrilla"
                description={`${grouped.active.length} activos · ${grouped.invited.length} invitados · ${grouped.pendingRequests.length} pendientes de aprobación`}
                trailing={
                    <button
                        type="button"
                        onClick={() => setShowInviteForm((v) => !v)}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconUserPlus size={16} />
                        Invitar músico
                    </button>
                }
            />

            {showInviteForm && (
                <div
                    className="rounded-xl p-5 border space-y-3 mb-6"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
                        Invitar a tu cuadrilla
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        El músico debe estar registrado en SimpleSerenatas. Recibirá una notificación
                        para aceptar o rechazar la invitación.
                    </p>

                    <label className="block">
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                            Email del músico
                        </span>
                        <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="musico@correo.cl"
                            className="mt-1 w-full px-3 py-2 rounded-lg border"
                            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                        />
                    </label>

                    <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                            Instrumentos
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {INSTRUMENT_OPTIONS.map((inst) => {
                                const selected = formInstruments.includes(inst);
                                return (
                                    <button
                                        key={inst}
                                        type="button"
                                        onClick={() => toggleInstrument(inst)}
                                        className="px-3 py-1 rounded-full text-xs border transition-colors"
                                        style={{
                                            background: selected ? 'var(--accent)' : 'transparent',
                                            color: selected ? 'var(--accent-contrast)' : 'var(--fg-secondary)',
                                            borderColor: selected ? 'var(--accent)' : 'var(--border)',
                                        }}
                                    >
                                        {inst}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                            Mensaje (opcional)
                        </span>
                        <textarea
                            value={formMessage}
                            onChange={(e) => setFormMessage(e.target.value)}
                            rows={2}
                            placeholder="Hola! Te invito a sumarte a mi cuadrilla…"
                            className="mt-1 w-full px-3 py-2 rounded-lg border"
                            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                        />
                    </label>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleInvite}
                            disabled={busyId === '__invite__'}
                            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            <IconSend size={16} />
                            {busyId === '__invite__' ? 'Enviando…' : 'Enviar invitación'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInviteForm(false)}
                            className="px-4 py-2 rounded-lg text-sm border"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="py-12 text-center" style={{ color: 'var(--fg-muted)' }}>
                    Cargando cuadrilla…
                </div>
            ) : totalCount === 0 ? (
                <div className="text-center py-12">
                    <IconUser
                        size={48}
                        className="mx-auto mb-3"
                        style={{ color: 'var(--border-strong)' }}
                    />
                    <p style={{ color: 'var(--fg-secondary)' }}>
                        Aún no tienes músicos en tu cuadrilla
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowInviteForm(true)}
                        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconPlus size={16} /> Invitar al primer músico
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.pendingRequests.length > 0 && (
                        <SectionList
                            title="Solicitudes pendientes"
                            description="Músicos que pidieron unirse a tu cuadrilla."
                            members={grouped.pendingRequests}
                            renderActions={(m) => (
                                <>
                                    <button
                                        type="button"
                                        disabled={busyId === m.id}
                                        onClick={() => handleDecision(m.id, true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                        style={{
                                            background: 'var(--success)',
                                            color: 'var(--accent-contrast)',
                                        }}
                                    >
                                        <IconCheck size={14} />
                                        Aceptar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busyId === m.id}
                                        onClick={() => handleDecision(m.id, false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 disabled:opacity-50"
                                        style={{
                                            borderColor: 'var(--border)',
                                            color: 'var(--fg-secondary)',
                                        }}
                                    >
                                        <IconX size={14} />
                                        Rechazar
                                    </button>
                                </>
                            )}
                        />
                    )}

                    {grouped.invited.length > 0 && (
                        <SectionList
                            title="Invitados (esperando respuesta)"
                            members={grouped.invited}
                            renderActions={(m) => (
                                <button
                                    type="button"
                                    disabled={busyId === m.id}
                                    onClick={() => handleRemove(m.id)}
                                    className="p-1.5 rounded-lg disabled:opacity-50"
                                    style={{
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg-muted)',
                                    }}
                                    title="Cancelar invitación"
                                >
                                    <IconTrash size={14} />
                                </button>
                            )}
                        />
                    )}

                    {grouped.active.length > 0 && (
                        <SectionList
                            title="Miembros activos"
                            description="Músicos disponibles para invitar a serenatas."
                            members={grouped.active}
                            renderActions={(m) => (
                                <button
                                    type="button"
                                    disabled={busyId === m.id}
                                    onClick={() => handleRemove(m.id)}
                                    className="p-1.5 rounded-lg disabled:opacity-50"
                                    style={{
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg-muted)',
                                    }}
                                    title="Remover de la cuadrilla"
                                >
                                    <IconTrash size={14} />
                                </button>
                            )}
                        />
                    )}

                    {grouped.inactive.length > 0 && (
                        <SectionList
                            title="Histórico"
                            members={grouped.inactive}
                            muted
                        />
                    )}
                </div>
            )}
        </SerenatasPageShell>
    );
}

function SectionList({
    title,
    description,
    members,
    renderActions,
    muted,
}: {
    title: string;
    description?: string;
    members: CrewMember[];
    renderActions?: (m: CrewMember) => React.ReactNode;
    muted?: boolean;
}) {
    return (
        <section>
            <h2
                className="text-base font-semibold mb-1"
                style={{ color: muted ? 'var(--fg-muted)' : 'var(--fg)' }}
            >
                {title}
            </h2>
            {description && (
                <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
                    {description}
                </p>
            )}
            <ul className="space-y-2">
                {members.map((m) => (
                    <MemberRow key={m.id} member={m} actions={renderActions?.(m)} muted={muted} />
                ))}
            </ul>
        </section>
    );
}

function MemberRow({
    member,
    actions,
    muted,
}: {
    member: CrewMember;
    actions?: React.ReactNode;
    muted?: boolean;
}) {
    const badge = STATUS_BADGE[member.membershipStatus];
    return (
        <li
            className="rounded-xl p-4 border flex items-center justify-between gap-3 flex-wrap"
            style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                opacity: muted ? 0.7 : 1,
            }}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-subtle)' }}
                >
                    <IconMicrophone size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                        {member.name ?? member.email ?? 'Músico'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                        {member.email}
                        {member.instruments?.length
                            ? ` · ${member.instruments.join(', ')}`
                            : ''}
                    </p>
                    {member.membershipMessage && (
                        <p className="text-xs italic mt-1" style={{ color: 'var(--fg-muted)' }}>
                            "{member.membershipMessage}"
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                        color: badge.tone,
                        border: `1px solid ${badge.tone}`,
                    }}
                >
                    {badge.label}
                </span>
                {actions}
            </div>
        </li>
    );
}
