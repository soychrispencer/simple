'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconCalendar,
    IconCheck,
    IconClock,
    IconMailbox,
    IconMapPin,
    IconUsersGroup,
    IconX,
} from '@tabler/icons-react';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import {
    useMusicianInvitations,
    useToast,
    type CrewInvitation,
    type MusicianLineupInvitation,
} from '@/hooks';

type Tab = 'inbox' | 'sent';

function formatCurrency(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value?: string | null) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function statusLabel(status: string): string {
    switch (status) {
        case 'invited':
            return 'Invitación pendiente';
        case 'requested':
            return 'Solicitud enviada';
        case 'accepted':
            return 'Aceptada';
        case 'declined':
            return 'Rechazada';
        case 'removed':
            return 'Removida';
        default:
            return status;
    }
}

export default function InvitacionesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { lineup, crew, counts, isLoading, respondLineup, respondCrew } =
        useMusicianInvitations({ pollMs: 30000 });
    const [tab, setTab] = useState<Tab>('inbox');
    const [busyId, setBusyId] = useState<string | null>(null);

    const inboxLineup = lineup.filter((l) => l.status === 'invited');
    const inboxCrew = crew.filter((m) => m.membershipStatus === 'invited');
    const sentLineup = lineup.filter((l) => l.status === 'requested' || l.status === 'accepted');
    const sentCrew = crew.filter((m) => m.membershipStatus === 'requested');

    const totalInbox = inboxLineup.length + inboxCrew.length;
    const totalSent = sentLineup.length + sentCrew.length;

    const handleLineupResponse = async (
        serenata: MusicianLineupInvitation,
        accept: boolean
    ) => {
        if (busyId) return;
        setBusyId(serenata.id);
        try {
            const reason = accept ? undefined : window.prompt('Motivo (opcional):') ?? undefined;
            const { ok } = await respondLineup(serenata.serenataId, accept, reason);
            if (ok) {
                showToast(accept ? 'Invitación aceptada' : 'Invitación rechazada', 'success');
            } else {
                showToast('No pudimos procesar tu respuesta', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    const handleCrewResponse = async (membership: CrewInvitation, accept: boolean) => {
        if (busyId) return;
        const cid = membership.crewMembershipId ?? membership.profileId;
        setBusyId(cid);
        try {
            const { ok } = await respondCrew(cid, accept);
            if (ok) {
                showToast(accept ? 'Te uniste a la cuadrilla' : 'Invitación rechazada', 'success');
            } else {
                showToast('No pudimos procesar tu respuesta', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    return (
        <SerenatasPageShell width="default">
            <SerenatasPageHeader
                title="Invitaciones"
                description={
                    totalInbox > 0
                        ? `${totalInbox} pendiente${totalInbox === 1 ? '' : 's'} de tu respuesta`
                        : 'No tienes invitaciones pendientes'
                }
            />

            <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <TabButton
                    active={tab === 'inbox'}
                    onClick={() => setTab('inbox')}
                    label={`Recibidas${totalInbox > 0 ? ` (${totalInbox})` : ''}`}
                />
                <TabButton
                    active={tab === 'sent'}
                    onClick={() => setTab('sent')}
                    label={`Enviadas${totalSent > 0 ? ` (${totalSent})` : ''}`}
                />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--accent)' }}
                    />
                </div>
            ) : tab === 'inbox' ? (
                <div className="space-y-8">
                    <Section
                        title="Invitaciones a serenatas"
                        subtitle="Coordinadores que te pidieron sumarte al lineup de una serenata específica."
                        count={counts.lineupInvited}
                    >
                        {inboxLineup.length === 0 ? (
                            <EmptyState
                                icon={<IconCalendar size={36} />}
                                text="No tienes invitaciones a serenatas"
                            />
                        ) : (
                            <div className="space-y-3">
                                {inboxLineup.map((s) => (
                                    <LineupCard
                                        key={s.id}
                                        item={s}
                                        busy={busyId === s.id}
                                        onAccept={() => handleLineupResponse(s, true)}
                                        onDecline={() => handleLineupResponse(s, false)}
                                        onView={() => router.push(`/tracking/${s.serenataId}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Invitaciones a cuadrillas"
                        subtitle="Coordinadores que quieren agregarte a su cuadrilla recurrente."
                        count={counts.crewInvited}
                    >
                        {inboxCrew.length === 0 ? (
                            <EmptyState
                                icon={<IconUsersGroup size={36} />}
                                text="No tienes invitaciones a cuadrillas"
                            />
                        ) : (
                            <div className="space-y-3">
                                {inboxCrew.map((m) => {
                                    const cid = m.crewMembershipId ?? m.profileId;
                                    return (
                                    <CrewCard
                                        key={cid}
                                        item={m}
                                        busy={busyId === cid}
                                        onAccept={() => handleCrewResponse(m, true)}
                                        onDecline={() => handleCrewResponse(m, false)}
                                    />
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            ) : (
                <div className="space-y-8">
                    <Section
                        title="Solicitudes a serenatas"
                        subtitle="Estás esperando que el coordinador apruebe tu solicitud."
                        count={counts.lineupRequested}
                    >
                        {sentLineup.length === 0 ? (
                            <EmptyState
                                icon={<IconClock size={36} />}
                                text="No has solicitado unirte a serenatas"
                            />
                        ) : (
                            <div className="space-y-3">
                                {sentLineup.map((s) => (
                                    <LineupCardSent
                                        key={s.id}
                                        item={s}
                                        onView={() => router.push(`/tracking/${s.serenataId}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Solicitudes a cuadrillas"
                        subtitle="Estás esperando que el coordinador acepte tu solicitud."
                        count={counts.crewRequested}
                    >
                        {sentCrew.length === 0 ? (
                            <EmptyState
                                icon={<IconClock size={36} />}
                                text="No tienes solicitudes pendientes"
                            />
                        ) : (
                            <div className="space-y-3">
                                {sentCrew.map((m) => (
                                    <CrewCardSent key={m.crewMembershipId ?? m.profileId} item={m} />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {!isLoading && totalInbox === 0 && totalSent === 0 && (
                <div className="card text-center py-12 mt-6">
                    <IconMailbox
                        size={48}
                        className="mx-auto mb-3"
                        style={{ color: 'var(--border-strong)' }}
                    />
                    <p style={{ color: 'var(--fg-muted)' }}>
                        Cuando un coordinador te invite o tú solicites unirte a alguien, aparecerá aquí.
                    </p>
                </div>
            )}
        </SerenatasPageShell>
    );
}

function TabButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            style={{
                borderColor: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--fg-muted)',
            }}
        >
            {label}
        </button>
    );
}

function Section({
    title,
    subtitle,
    count,
    children,
}: {
    title: string;
    subtitle?: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="mb-3">
                <div className="flex items-center gap-2">
                    <h2
                        className="text-lg font-semibold"
                        style={{ color: 'var(--fg)' }}
                    >
                        {title}
                    </h2>
                    {count != null && count > 0 && (
                        <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--accent-contrast)',
                            }}
                        >
                            {count}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div
            className="card text-center py-8"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
            <div
                className="mx-auto mb-2 flex items-center justify-center"
                style={{ color: 'var(--border-strong)' }}
            >
                {icon}
            </div>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {text}
            </p>
        </div>
    );
}

function LineupCard({
    item,
    busy,
    onAccept,
    onDecline,
    onView,
}: {
    item: MusicianLineupInvitation;
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onView: () => void;
}) {
    return (
        <div className="card">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                        Serenata para {item.recipientName ?? '—'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(item.eventDate)} · {item.eventTime ?? '—'}
                        {item.duration ? ` · ${item.duration} min` : ''}
                    </p>
                </div>
                <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--accent)' }}
                >
                    {formatCurrency(item.price)}
                </span>
            </div>

            {(item.address || item.city) && (
                <div
                    className="flex items-center gap-2 text-sm mb-2"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    <IconMapPin size={16} />
                    <span className="truncate">
                        {item.address ?? ''}
                        {item.city ? ` · ${item.city}` : ''}
                    </span>
                </div>
            )}

            {item.message && (
                <p
                    className="text-sm mb-3 italic"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    "{item.message}"
                </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
                <button
                    type="button"
                    disabled={busy}
                    onClick={onAccept}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconCheck size={16} /> Aceptar
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onDecline}
                    className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                    <IconX size={16} /> Rechazar
                </button>
                <button
                    type="button"
                    onClick={onView}
                    className="px-4 py-2 rounded-lg text-sm font-medium ml-auto"
                    style={{ color: 'var(--accent)' }}
                >
                    Ver detalles
                </button>
            </div>
        </div>
    );
}

function LineupCardSent({
    item,
    onView,
}: {
    item: MusicianLineupInvitation;
    onView: () => void;
}) {
    return (
        <div className="card">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                        Serenata para {item.recipientName ?? '—'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {formatDate(item.eventDate)} · {item.eventTime ?? '—'}
                    </p>
                </div>
                <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                    {statusLabel(item.status)}
                </span>
            </div>
            <button
                type="button"
                onClick={onView}
                className="text-sm font-medium"
                style={{ color: 'var(--accent)' }}
            >
                Ver detalles
            </button>
        </div>
    );
}

function CrewCard({
    item,
    busy,
    onAccept,
    onDecline,
}: {
    item: CrewInvitation;
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <div className="card">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                {item.coordinatorName ?? 'Coordinador'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {item.city ?? '—'}
                {item.rating ? ` · ⭐ ${item.rating}` : ''}
            </p>
            {item.membershipMessage && (
                <p
                    className="text-sm mt-2 italic"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    "{item.membershipMessage}"
                </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
                <button
                    type="button"
                    disabled={busy}
                    onClick={onAccept}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconCheck size={16} /> Unirme
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onDecline}
                    className="px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                    <IconX size={16} /> Rechazar
                </button>
            </div>
        </div>
    );
}

function CrewCardSent({ item }: { item: CrewInvitation }) {
    return (
        <div className="card flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                    {item.coordinatorName ?? 'Coordinador'}
                </h3>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {item.city ?? '—'}
                </p>
            </div>
            <span
                className="text-xs font-medium px-2 py-1 rounded"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
                {statusLabel(item.membershipStatus)}
            </span>
        </div>
    );
}
