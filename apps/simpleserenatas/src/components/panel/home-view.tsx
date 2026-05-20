'use client';

import { useEffect, useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import {
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelList,
    PanelListRow,
    PanelNotice,
    PanelStatCard,
    PanelStatusBadge,
} from '@simple/ui';
import type { Invitation, Serenata, SerenataGroup, Profiles } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import type { AppMode } from '@/lib/app-mode';
import { type Section } from '@/context/serenata-context';
import { isOwnerHomePendingMetric } from '@/lib/serenata-pending';
import { isUpcomingScheduled, needsClosure } from '@/lib/serenata-dates';
import {
    formatDate,
    formatShortSerenataDate,
    money,
    SerenataRow,
    toInputDate,
} from './shared';
import { ProfileIncompleteNotice } from './profile-incomplete-notice';
import { OwnerOnboardingCard } from './owner-onboarding-card';
import { MusicianAvailabilityToggle } from './musician-availability-toggle';

export function HomeView(props: {
    mode: AppMode;
    ownerFeaturesEnabled: boolean;
    profiles: Profiles;
    serenatas: Serenata[];
    ownerSerenatas: Serenata[];
    ownerClosureSerenatas: Serenata[];
    agendaItems: Serenata[];
    groups: SerenataGroup[];
    invitations: Invitation[];
    setSection: (section: Section, query?: Record<string, string | null | undefined>) => void;
    openClientRequest?: () => void;
    accountSuspended?: boolean;
    refresh: () => Promise<void>;
}) {
    if (props.mode === 'client') {
        return <ClientHome {...props} />;
    }

    return <WorkHome {...props} />;
}

function sortSerenatasByEvent(a: Serenata, b: Serenata) {
    const dateA = toInputDate(a.eventDate) ?? '';
    const dateB = toInputDate(b.eventDate) ?? '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.eventTime ?? '').localeCompare(b.eventTime ?? '');
}

function ViewAllAction({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
        >
            {label}
            <IconChevronRight size={11} />
        </button>
    );
}

function ClientHome(props: Parameters<typeof HomeView>[0]) {
    const pending = props.serenatas.filter(
        (item) =>
            item.status === 'payment_pending' ||
            item.status === 'pending' ||
            item.status === 'accepted_pending_group',
    );
    const confirmed = props.serenatas.filter(isUpcomingScheduled).length;
    const completed = props.serenatas.filter((item) => item.status === 'completed').length;
    const toClose = props.serenatas.filter(needsClosure);
    const inProgress = [...pending].sort(sortSerenatasByEvent).slice(0, 5);
    const upcoming = props.serenatas
        .filter(isUpcomingScheduled)
        .sort(sortSerenatasByEvent)
        .slice(0, 3);
    const closurePreview = [...toClose].sort(sortSerenatasByEvent).slice(0, 3);

    return (
        <div className="grid gap-4">
            <ProfileIncompleteNotice mode="client" profiles={props.profiles} />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <PanelStatCard label="Contratadas" value={String(props.serenatas.length)} />
                <PanelStatCard label="En proceso" value={String(pending.length)} />
                <PanelStatCard label="Próximas" value={String(confirmed)} />
                <PanelStatCard
                    label={toClose.length > 0 ? 'Por cerrar' : 'Completadas'}
                    value={String(toClose.length > 0 ? toClose.length : completed)}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="En seguimiento"
                        description="Serenatas con pago, confirmación o grupo en preparación."
                        actions={(
                            <ViewAllAction label="Ver todas" onClick={() => props.setSection('serenatas')} />
                        )}
                    />
                    {inProgress.length === 0 ? (
                        <div className="space-y-3">
                            <PanelNotice tone="neutral">No tienes serenatas en proceso ahora.</PanelNotice>
                            <PanelButton
                                type="button"
                                className="w-full"
                                disabled={props.accountSuspended}
                                onClick={() => props.openClientRequest?.() ?? props.setSection('mariachis')}
                            >
                                Contratar serenata
                            </PanelButton>
                        </div>
                    ) : (
                        <PanelList className="mt-4 border-0 rounded-2xl">
                            {inProgress.map((item, index) => (
                                <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                                    <SerenataRow item={item} context="client" />
                                </PanelListRow>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>

                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Próximas serenatas"
                        description="Eventos confirmados por el grupo."
                        actions={(
                            <ViewAllAction label="Ver todas" onClick={() => props.setSection('serenatas')} />
                        )}
                    />
                    {upcoming.length === 0 ? (
                        <div className="space-y-3">
                            <PanelNotice tone="neutral">Cuando el grupo confirme una serenata, aparecerá aquí.</PanelNotice>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={() => props.setSection('serenatas')}
                            >
                                Ver mis serenatas
                            </PanelButton>
                        </div>
                    ) : (
                        <PanelList className="mt-4 border-0 rounded-2xl">
                            {upcoming.map((item, index) => (
                                <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                                    <SerenataRow item={item} context="client" />
                                </PanelListRow>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>
            </div>

            {closurePreview.length > 0 ? (
                <ClosurePendingCard
                    items={closurePreview}
                    total={toClose.length}
                    onViewAll={() => props.setSection('serenatas')}
                    context="client"
                />
            ) : null}
        </div>
    );
}

function ClosurePendingCard({
    items,
    total,
    onViewAll,
    context,
}: {
    items: Serenata[];
    total: number;
    onViewAll: () => void;
    context?: 'client';
}) {
    return (
        <PanelCard size="md">
            <PanelBlockHeader
                title="Por cerrar"
                description="Eventos pasados que aún no se marcaron como completados o cancelados."
                actions={<ViewAllAction label="Ver todas" onClick={onViewAll} />}
            />
            <PanelList className="mt-4 border-0 rounded-2xl">
                {items.map((item, index) => (
                    <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                        <SerenataRow item={item} context={context} />
                    </PanelListRow>
                ))}
            </PanelList>
            {total > items.length ? (
                <p className="mt-3 text-center text-xs text-fg-muted">
                    y {total - items.length} más pendiente{total - items.length === 1 ? '' : 's'} de cierre
                </p>
            ) : null}
        </PanelCard>
    );
}

function WorkHome(props: Parameters<typeof HomeView>[0]) {
    const ownerActive = props.ownerFeaturesEnabled;
    const [providerMusicianCount, setProviderMusicianCount] = useState<number | null>(null);

    useEffect(() => {
        if (!ownerActive) {
            setProviderMusicianCount(null);
            return;
        }
        let cancelled = false;
        void (async () => {
            const groupsResponse = await serenatasApi.myProviderGroups();
            if (cancelled || !groupsResponse.ok || groupsResponse.items.length === 0) {
                if (!cancelled) setProviderMusicianCount(0);
                return;
            }
            const group = groupsResponse.items[0];
            const membersResponse = await serenatasApi.providerGroupMembers(group.id);
            if (cancelled) return;
            setProviderMusicianCount(
                membersResponse.ok
                    ? membersResponse.items.filter((m) => m.status === 'active').length
                    : 0,
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [ownerActive, props.groups]);
    const pendingApp = ownerActive
        ? props.ownerSerenatas.filter((item) => isOwnerHomePendingMetric(item))
        : [];
    const reviewPending = () => {
        props.setSection('solicitudes', { filter: 'pending' });
    };

    const musicianGroupCount = new Set([
        ...props.invitations.map((item) => item.groupId),
        ...props.serenatas.map((item) => item.groupId).filter((id): id is string => Boolean(id)),
    ]).size;
    const pendingInvitations = props.invitations.filter((item) => item.status === 'invited');
    const needsGroupSerenatas = ownerActive
        ? props.ownerSerenatas.filter((item) => item.status === 'accepted_pending_group')
        : [];
    const legacyMemberCount = props.groups.reduce(
        (sum, group) => sum + group.members.filter((member) => member.status === 'accepted').length,
        0,
    );
    const confirmedMembers = ownerActive
        ? (providerMusicianCount ?? legacyMemberCount)
        : legacyMemberCount;
    const upcomingSource = ownerActive ? props.agendaItems : props.serenatas;
    const upcoming = upcomingSource
        .filter(isUpcomingScheduled)
        .sort(sortSerenatasByEvent)
        .slice(0, 3);
    const toClose = ownerActive ? props.ownerClosureSerenatas : props.serenatas.filter(needsClosure);
    const closurePreview = [...toClose].sort(sortSerenatasByEvent).slice(0, 3);
    const showAssignGroupCard = ownerActive && needsGroupSerenatas.length > 0;

    return (
        <div className="grid gap-4">
            <ProfileIncompleteNotice mode="work" profiles={props.profiles} />
            <OwnerOnboardingCard profiles={props.profiles} setSection={props.setSection} />
            {props.profiles.musician && !ownerActive ? (
                <MusicianAvailabilityToggle musician={props.profiles.musician} refresh={props.refresh} />
            ) : null}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <PanelStatCard label="Mis serenatas" value={String(props.serenatas.length)} />
                <PanelStatCard
                    label={ownerActive ? 'Músicos' : 'Grupos'}
                    value={String(ownerActive ? confirmedMembers : musicianGroupCount)}
                />
                {!ownerActive ? (
                    <PanelStatCard label="Invitaciones" value={String(props.invitations.length)} />
                ) : (
                    <PanelStatCard label="Solicitudes" value={String(pendingApp.length)} />
                )}
                {ownerActive ? (
                    <PanelStatCard
                        label={toClose.length > 0 ? 'Por cerrar' : 'Por asignar'}
                        value={String(toClose.length > 0 ? toClose.length : needsGroupSerenatas.length)}
                    />
                ) : (
                    <PanelStatCard label="Pendientes" value={String(pendingInvitations.length)} />
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {ownerActive ? (
                    <PanelCard size="md">
                        <PanelBlockHeader
                            title="Solicitudes pendientes"
                            description="Leads del marketplace por revisar."
                            actions={<ViewAllAction label="Ver todas" onClick={reviewPending} />}
                        />
                        {pendingApp.length === 0 ? (
                            <div className="space-y-3">
                                <PanelNotice tone="neutral">
                                    Sin solicitudes pendientes. Cuando un cliente solicite tu grupo, aparecerá aquí.
                                </PanelNotice>
                                <PanelButton type="button" variant="secondary" className="w-full" onClick={reviewPending}>
                                    Ir a solicitudes
                                </PanelButton>
                            </div>
                        ) : (
                            <PanelList className="mt-4 border-0 rounded-2xl">
                                {pendingApp.slice(0, 5).map((item, index) => (
                                    <PanelListRow
                                        key={item.id}
                                        divider={index > 0}
                                        className="px-4 py-3"
                                    >
                                        <button
                                            type="button"
                                            onClick={reviewPending}
                                            className="flex w-full items-center justify-between gap-3 text-left"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-fg">{item.recipientName}</p>
                                                <p className="mt-1 text-xs text-fg-muted">
                                                    {item.eventTime} · {item.comuna ?? 'Sin comuna'}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold text-accent">{money(item.price)}</span>
                                        </button>
                                    </PanelListRow>
                                ))}
                            </PanelList>
                        )}
                    </PanelCard>
                ) : (
                    <PanelCard size="md">
                        <PanelBlockHeader
                            title="Invitaciones pendientes"
                            description="Revisa fecha, comuna e instrumento antes de responder."
                            actions={(
                                <ViewAllAction label="Ver todas" onClick={() => props.setSection('invitations')} />
                            )}
                        />
                        {pendingInvitations.length === 0 ? (
                            <div className="space-y-3">
                                <PanelNotice tone="neutral">No tienes invitaciones nuevas por ahora.</PanelNotice>
                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => props.setSection('invitations')}
                                >
                                    Ver invitaciones
                                </PanelButton>
                            </div>
                        ) : (
                            <PanelList className="mt-4 border-0 rounded-2xl">
                                {pendingInvitations.slice(0, 5).map((item, index) => (
                                    <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => props.setSection('invitations')}
                                            className="flex w-full items-center justify-between gap-3 text-left"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-semibold text-fg">{item.groupName}</p>
                                                    {index === 0 ? (
                                                        <PanelStatusBadge
                                                            tone="warning"
                                                            label={`${pendingInvitations.length} nueva${pendingInvitations.length === 1 ? '' : 's'}`}
                                                        />
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 text-xs text-fg-muted">
                                                    {(item.eventTime ? `${item.eventTime} · ` : '')}
                                                    {formatDate(item.eventDate ?? item.groupDate)}
                                                    {item.comuna ? ` · ${item.comuna}` : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-accent">
                                                {item.instrument ?? 'Instrumento'}
                                            </span>
                                        </button>
                                    </PanelListRow>
                                ))}
                            </PanelList>
                        )}
                    </PanelCard>
                )}

                <PanelCard size="md">
                    <PanelBlockHeader
                        title={showAssignGroupCard ? 'Por asignar grupo' : 'Próximas serenatas'}
                        description={
                            showAssignGroupCard
                                ? 'Serenatas aceptadas que aún necesitan un grupo.'
                                : 'Agenda confirmada para los próximos días.'
                        }
                        actions={(
                            <ViewAllAction
                                label="Ver todas"
                                onClick={() => props.setSection(showAssignGroupCard ? 'solicitudes' : 'agenda')}
                            />
                        )}
                    />
                    {showAssignGroupCard ? (
                        <PanelList className="mt-4 border-0 rounded-2xl">
                            {needsGroupSerenatas.slice(0, 5).map((item, index) => (
                                <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => props.setSection('solicitudes')}
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-fg">{item.recipientName}</p>
                                            <p className="mt-1 text-xs text-fg-muted">{formatShortSerenataDate(item)}</p>
                                        </div>
                                        <span className="shrink-0 text-sm font-semibold text-accent">Asignar</span>
                                    </button>
                                </PanelListRow>
                            ))}
                        </PanelList>
                    ) : upcoming.length === 0 ? (
                        <div className="space-y-3">
                            <PanelNotice tone="neutral">Sin serenatas próximas en la agenda.</PanelNotice>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={() => props.setSection('agenda')}
                            >
                                Ver agenda
                            </PanelButton>
                        </div>
                    ) : (
                        <PanelList className="mt-4 border-0 rounded-2xl">
                            {upcoming.map((item, index) => (
                                <PanelListRow key={item.id} divider={index > 0} className="px-4 py-3">
                                    <SerenataRow item={item} />
                                </PanelListRow>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>
            </div>

            {!showAssignGroupCard && closurePreview.length > 0 ? (
                <ClosurePendingCard
                    items={closurePreview}
                    total={toClose.length}
                    onViewAll={() => props.setSection('agenda')}
                />
            ) : null}
        </div>
    );
}
