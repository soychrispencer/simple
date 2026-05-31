'use client';

import { IconCheck, IconClock, IconMapPin, IconX } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelStatusBadge } from '@simple/ui/panel';
import type { Invitation, Profiles } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { EmptyBlock, formatDate, toInputDate } from './shared';
import { ProfileIncompleteNotice } from './profile-incomplete-notice';

function invitationStatusLabel(status: Invitation['status']) {
    if (status === 'invited') return 'Pendiente';
    if (status === 'accepted' || status === 'active') return 'Aceptada';
    if (status === 'removed') return 'Quitada';
    if (status === 'rejected') return 'Rechazada';
    return 'Cancelada';
}

function invitationStatusTone(status: Invitation['status']): 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === 'accepted' || status === 'active') return 'success';
    if (status === 'rejected' || status === 'removed') return 'danger';
    if (status === 'invited') return 'warning';
    return 'neutral';
}

function invitationEventDate(item: Invitation) {
    return item.eventDate ?? item.groupDate;
}

export function InvitationsView({
    profiles,
    invitations,
    refresh,
}: {
    profiles: Profiles;
    invitations: Invitation[];
    refresh: () => Promise<void>;
}) {
    async function respond(id: string, status: 'accepted' | 'rejected') {
        await serenatasApi.respondInvitation(id, status);
        await refresh();
    }

    const pending = invitations.filter((item) => item.status === 'invited');

    return (
        <div className="grid gap-4">
            <ProfileIncompleteNotice mode="work" profiles={profiles} />
            {pending.length > 0 ? (
                <PanelCard>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-(--fg)">
                                {pending.length} invitacion{pending.length === 1 ? '' : 'es'} pendiente{pending.length === 1 ? '' : 's'}
                            </p>
                            <p className="mt-1 text-sm text-(--fg-muted)">
                                Revisa si es una invitación al mariachi o a una serenata antes de aceptar.
                            </p>
                        </div>
                        <PanelStatusBadge tone="warning" label={`${pending.length} por responder`} />
                    </div>
                </PanelCard>
            ) : null}
            <PanelCard>
                <h2 className="text-lg font-semibold text-(--fg)">Invitaciones</h2>
                <div className="mt-4 grid gap-3">
                    {invitations.length === 0 ? (
                        <EmptyBlock title="Sin invitaciones" description="Cuando el dueño de un grupo te invite, aparecerá aquí." />
                    ) : invitations.map((item) => {
                        const eventDate = invitationEventDate(item);
                        const eventTime = item.eventTime ?? null;
                        const locationLine = item.address
                            ? `${item.comuna ? `${item.comuna} · ` : ''}${item.address}`
                            : item.comuna ?? null;
                        const cardTone = item.status === 'invited'
                            ? 'border-(--accent-border) bg-(--accent-soft)'
                            : 'border-(--border) bg-(--surface)';

                        return (
                            <div key={item.id} className={`rounded-xl border p-4 ${cardTone}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-(--fg)">{item.groupName}</p>
                                        {item.ownerName ? (
                                            <p className="mt-1 text-xs text-(--fg-muted)">Dueño: {item.ownerName}</p>
                                        ) : null}
                                        <div className="mt-3 grid gap-2 text-sm text-(--fg-secondary)">
                                            <span className="inline-flex items-center gap-2">
                                                <IconClock size={16} className="shrink-0 text-(--fg-muted)" />
                                                {eventTime ? `${eventTime} · ` : ''}{formatDate(eventDate)}
                                            </span>
                                            {locationLine ? (
                                                <span className="inline-flex items-start gap-2">
                                                    <IconMapPin size={16} className="mt-0.5 shrink-0 text-(--fg-muted)" />
                                                    <span>{locationLine}</span>
                                                </span>
                                            ) : null}
                                            <span>Instrumento: {item.instrument ?? 'Por definir'}</span>
                                            {item.recipientName ? (
                                                <span>Serenata para: {item.recipientName}</span>
                                            ) : null}
                                        </div>
                                        {item.message ? (
                                            <p className="mt-3 rounded-xl border border-(--border) bg-(--bg-subtle) px-3 py-2 text-sm text-(--fg-secondary)">
                                                <span className="font-medium text-(--fg)">Mensaje del dueño: </span>
                                                {item.message}
                                            </p>
                                        ) : null}
                                    </div>
                                    <PanelStatusBadge tone={invitationStatusTone(item.status)} label={invitationStatusLabel(item.status)} />
                                </div>
                                {item.status === 'invited' ? (
                                    <div className="mt-4 flex gap-2">
                                        <PanelButton onClick={() => void respond(item.id, 'accepted')}><IconCheck size={16} /> Aceptar</PanelButton>
                                        <PanelButton variant="secondary" onClick={() => void respond(item.id, 'rejected')}><IconX size={16} /> Rechazar</PanelButton>
                                    </div>
                                ) : (item.status === 'accepted' || item.status === 'active') && item.serenataId && toInputDate(eventDate) ? (
                                    <p className="mt-3 text-xs text-(--fg-muted)">
                                        Quedó en tu agenda para el {formatDate(eventDate)}.
                                    </p>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </PanelCard>
        </div>
    );
}
