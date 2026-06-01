'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelEmptyState, PanelField, PanelNotice, PanelStatusBadge, usePanelConfirm, type PanelConfirmOptions } from '@simple/ui/panel';
import { IconArrowDown, IconArrowUp, IconEdit, IconLoader2, IconPlus, IconTrash, IconUser, IconUserPlus, IconX } from '@tabler/icons-react';
import type {
    MusicianDirectoryItem,
    MusicianPublicProfile,
    ProviderGroup,
    ProviderGroupMemberInvite,
    ProviderGroupMember,
    SerenataGroup,
    SerenataGroupMember,
    SerenataGroupPendingInvite,
    SerenataMePlan,
} from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import { validateChileMobilePhone, formatChileMobileHint } from '@/lib/chile-phone';
import { PanelSheet } from './panel-sheet';
import { EmptyBlock, FieldInput, FormFeedback, InstrumentSelect, type FormStatus } from './shared';
import {
    buildGroupInstrumentSlots,
    groupRequiredInstruments,
    type GroupInstrumentSlot,
} from '@/lib/group-instrument-slots';
import { MusicianInstrumentIcon } from '@/lib/musician-instrument-icon';
import { GRUPOS_TAB_LABEL } from '@/lib/serenatas-terminology';
import { toMusicianPublicProfile } from '@/lib/musician-display';
import { MusicianSummaryCard } from '@/components/panel/musician-summary-card';
import { MusicianProfileModal } from '@/components/panel/musician-profile-modal';

export function GroupsView({
    musicians,
    refresh,
}: {
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
}) {
    const { mariachi: activeMariachi, hasMariachi, loading: mariachisLoading, error: mariachisError, refresh: refreshMariachis } = useMyMariachi();
    const [providerMembers, setProviderMembers] = useState<ProviderGroupMember[]>([]);
    const [providerMemberInvites, setProviderMemberInvites] = useState<ProviderGroupMemberInvite[]>([]);
    const [providerMembersLoading, setProviderMembersLoading] = useState(false);
    const [providerMembersError, setProviderMembersError] = useState<string | null>(null);
    const [musicianGroups, setMusicianGroups] = useState<SerenataGroup[]>([]);
    const [activeMusicianGroupId, setActiveMusicianGroupId] = useState<string | null>(null);
    const [providerMemberInviteOpen, setProviderMemberInviteOpen] = useState(false);
    const [addingMusicianId, setAddingMusicianId] = useState<string | null>(null);
    const [draggingMusicianId, setDraggingMusicianId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editGroup, setEditGroup] = useState<SerenataGroup | null>(null);
    const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
    const [profileMusicianId, setProfileMusicianId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });
    const [mePlan, setMePlan] = useState<SerenataMePlan | null>(null);
    const { confirm } = usePanelConfirm();

    const musicianById = useMemo(
        () => new Map(musicians.map((musician) => [musician.id, musician])),
        [musicians],
    );
    const isPro = mePlan?.plan === 'pro';
    const currentGroupsCount = musicianGroups.filter((group) => group.status !== 'closed').length;
    const canCreateGroup = isPro || currentGroupsCount < 1;

    const loadMusicianGroups = useCallback(async (providerGroupId: string) => {
        const response = await serenatasApi.groups(providerGroupId);
        if (!response.ok) {
            setMusicianGroups([]);
            setActiveMusicianGroupId(null);
            setStatus({ loading: false, error: response.error ?? 'No pudimos cargar los grupos.', ok: null });
            return false;
        }
        const items = response.items ?? [];
        setMusicianGroups(items);
        setActiveMusicianGroupId((current) => {
            if (current && items.some((group) => group.id === current)) return current;
            return items[0]?.id ?? null;
        });
        return true;
    }, []);

    const loadProviderMembers = useCallback(async (providerGroupId: string) => {
        setProviderMembersLoading(true);
        setProviderMembersError(null);
        const response = await serenatasApi.providerGroupMembers(providerGroupId);
        setProviderMembersLoading(false);
        if (!response.ok) {
            setProviderMembers([]);
            setProviderMembersError(response.error ?? 'No pudimos cargar los integrantes.');
            return false;
        }
        setProviderMembers(response.items ?? []);
        return true;
    }, []);

    const loadProviderMemberInvites = useCallback(async (providerGroupId: string) => {
        const response = await serenatasApi.providerGroupMemberInvites(providerGroupId);
        if (!response.ok) {
            setProviderMemberInvites([]);
            return false;
        }
        setProviderMemberInvites(response.items ?? []);
        return true;
    }, []);

    useEffect(() => {
        if (mariachisLoading) return;
        if (mariachisError) {
            setStatus({ loading: false, error: mariachisError, ok: null });
            return;
        }
        if (!hasMariachi || !activeMariachi) {
            setProviderMembers([]);
            setProviderMemberInvites([]);
            setMusicianGroups([]);
            setActiveMusicianGroupId(null);
            setStatus({ loading: false, error: null, ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        void Promise.all([
            loadMusicianGroups(activeMariachi.id),
            loadProviderMembers(activeMariachi.id),
            loadProviderMemberInvites(activeMariachi.id),
            serenatasApi.mePlan().then((response) => {
                if (response.ok) setMePlan(response);
            }),
        ]).then(([groupsOk]) => {
            if (groupsOk) setStatus({ loading: false, error: null, ok: null });
        });
    }, [hasMariachi, activeMariachi?.id, mariachisLoading, mariachisError, loadMusicianGroups, loadProviderMembers, loadProviderMemberInvites]);

    function openCreateGroup() {
        if (!canCreateGroup) {
            setActionError('El plan Gratis incluye 1 grupo de músicos. Suscríbete a Pro para administrar más grupos y equipos.');
            return;
        }
        setActionError(null);
        setCreateOpen(true);
    }

    async function selectMusicianGroup(groupId: string) {
        setActiveMusicianGroupId(groupId);
        setActionError(null);
    }

    async function deleteMusicianGroup(group: SerenataGroup) {
        const confirmed = await confirm({
            title: 'Eliminar grupo',
            message: `¿Eliminar el grupo "${group.name}"? Los músicos invitados dejarán de pertenecer a este grupo.`,
            confirmLabel: 'Eliminar',
            tone: 'danger',
        });
        if (!confirmed) return;
        setDeletingGroupId(group.id);
        setActionError(null);
        const response = await serenatasApi.deleteGroup(group.id);
        setDeletingGroupId(null);
        if (!response.ok) {
            setActionError(response.error ?? 'No pudimos eliminar el grupo.');
            return;
        }
        if (activeMariachi) {
            await loadMusicianGroups(activeMariachi.id);
        }
        await refresh();
    }

    async function inviteRegisteredMusicianToBank(musicianId: string) {
        if (!activeMariachi) return;
        const musician = musicians.find((entry) => entry.id === musicianId);
        setAddingMusicianId(musicianId);
        setActionError(null);
        const response = await serenatasApi.inviteProviderGroupMember(activeMariachi.id, {
            musicianId,
            role: 'musician',
            instruments: musician?.instruments?.length ? musician.instruments : (musician?.instrument ? [musician.instrument] : []),
            message: null,
        });
        setAddingMusicianId(null);
        if (!response.ok) {
            setActionError(response.error ?? 'No pudimos invitar al músico al banco.');
            return;
        }
        await loadProviderMembers(activeMariachi.id);
        await refresh();
    }

    async function addRegisteredMusicianToGroup(group: SerenataGroup, musicianId: string, slotIndex: number) {
        const slots = buildGroupInstrumentSlots(group);
        const targetSlot = slots[slotIndex];
        if (!targetSlot) {
            setActionError('El cupo seleccionado no existe en este grupo.');
            return;
        }
        if (targetSlot.member && targetSlot.member.musicianId !== musicianId) {
            setActionError(`El cupo de ${targetSlot.instrument} ya está ocupado.`);
            return;
        }
        const bankMember = providerMembers.find((member) => member.musicianId === musicianId);
        if (!bankMember || bankMember.status !== 'active') {
            setActionError('Este músico debe pertenecer a tu plantilla (invitación aceptada) antes de sumarlo a un grupo.');
            return;
        }
        const directoryMusician = musicianById.get(musicianId);
        const availableNow = bankMember.availableNow ?? directoryMusician?.availableNow;
        if (!availableNow) {
            setActionError(`${directoryMusician?.name ?? 'Este músico'} marcó que no está disponible. No puedes asignarlo hasta que active su disponibilidad.`);
            return;
        }
        const existingMember = group.members.find((member) =>
            member.musicianId === musicianId && ['accepted', 'invited'].includes(member.status),
        );
        setActiveMusicianGroupId(group.id);
        setAddingMusicianId(musicianId);
        setActionError(null);
        const response = existingMember
            ? await serenatasApi.updateGroupMember(group.id, existingMember.id, { slotIndex })
            : await serenatasApi.inviteMember(group.id, { musicianId, slotIndex });
        setAddingMusicianId(null);
        if (!response.ok) {
            setActionError(response.error ?? 'No pudimos sumar el músico al grupo.');
            return;
        }
        if (activeMariachi?.id) {
            await loadMusicianGroups(activeMariachi?.id);
            await loadProviderMembers(activeMariachi?.id);
        }
        await refresh();
    }

    if (mariachisLoading && !hasMariachi) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" />
                Cargando grupos…
            </p>
        );
    }

    if (mariachisError) {
        return (
            <PanelNotice tone="error">
                {mariachisError}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshMariachis()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    if (!hasMariachi) {
        return (
            <EmptyBlock
                title="Crea tu mariachi primero"
                description="Configura tus datos comerciales y publícalo en la pestaña Publicar. Después podrás armar grupos de músicos aquí."
            />
        );
    }

    return (
        <div className="w-full">
            <PanelBlockHeader
                title={GRUPOS_TAB_LABEL}
                description={`Grupos de músicos de ${activeMariachi.name}. Úsalos al conformar una serenata en Solicitudes.`}
            />

            {!isPro && currentGroupsCount >= 1 ? (
                <PanelNotice tone="neutral" className="mb-4">
                    El plan Gratis incluye 1 grupo de músicos. Pro permite administrar más grupos y equipos.
                </PanelNotice>
            ) : null}

            {actionError ? (
                <PanelNotice tone="error" className="mb-4">
                    {actionError}
                </PanelNotice>
            ) : null}

            {status.loading ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={16} className="animate-spin" />
                    Cargando grupos de músicos…
                </p>
            ) : status.error ? (
                <PanelEmptyState
                    title="No se cargaron los grupos"
                    description={status.error}
                    action={
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={() => activeMariachi?.id && void loadMusicianGroups(activeMariachi?.id)}
                        >
                            Reintentar
                        </PanelButton>
                    }
                />
            ) : (
                <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.1fr)_390px]">
                    <div className="grid min-w-0 content-start gap-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                                Grupos
                            </p>
                            <PanelButton variant="secondary" size="sm" onClick={openCreateGroup}>
                                <IconPlus size={14} />
                                Nuevo grupo
                                {!canCreateGroup ? <PanelStatusBadge tone="neutral" label="Pro" size="xs" /> : null}
                            </PanelButton>
                        </div>

                        {musicianGroups.length === 0 ? (
                            <PanelEmptyState
                                title="Sin grupos de músicos"
                                description="Crea tu primer grupo (por ejemplo, trío, cuarteto o grupo completo) y luego invita músicos."
                                action={
                                    <PanelButton variant="secondary" size="sm" onClick={openCreateGroup}>
                                        <IconPlus size={14} />
                                        Nuevo grupo
                                    </PanelButton>
                                }
                            />
                        ) : (
                            <div className="grid gap-4">
                                {musicianGroups.map((group) => {
                                    const selected = group.id === activeMusicianGroupId;
                                    const deleting = deletingGroupId === group.id;
                                    const instrumentSlots = buildGroupInstrumentSlots(group);
                                    const occupied = instrumentSlots.filter((slot) => slot.member).length;
                                    const capacity = instrumentSlots.length;
                                    const draggedMusicianId = draggingMusicianId;
                                    return (
                                        <PanelCard
                                            key={group.id}
                                            size="sm"
                                            className={selected ? 'border-accent bg-accent-soft/40' : ''}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void selectMusicianGroup(group.id)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <p className="text-base font-semibold text-fg">{group.name}</p>
                                                    <p className="mt-1 text-sm text-fg-muted">
                                                        {occupied}/{capacity} cupos
                                                    </p>
                                                </button>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <PanelButton
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        aria-label={`Editar ${group.name}`}
                                                        onClick={() => setEditGroup(group)}
                                                    >
                                                        <IconEdit size={14} aria-hidden />
                                                        Editar
                                                    </PanelButton>
                                                    <PanelButton
                                                        type="button"
                                                        variant="danger"
                                                        size="sm"
                                                        disabled={deleting}
                                                        aria-label={`Eliminar ${group.name}`}
                                                        onClick={() => void deleteMusicianGroup(group)}
                                                    >
                                                        {deleting ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
                                                    </PanelButton>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid gap-2">
                                                {instrumentSlots.map((slot) => (
                                                    <GroupInstrumentSlotRow
                                                        key={`${group.id}-slot-${slot.index}`}
                                                        slot={slot}
                                                        draggingMusicianId={draggedMusicianId}
                                                        musicianById={musicianById}
                                                        onDropMusician={(musicianId) => void addRegisteredMusicianToGroup(group, musicianId, slot.index)}
                                                        onOpenProfile={(musicianId) => setProfileMusicianId(musicianId)}
                                                        onRemoveMember={async (member) => {
                                                            await serenatasApi.updateGroupMember(group.id, member.id, { status: 'cancelled' });
                                                            if (activeMariachi?.id) await loadMusicianGroups(activeMariachi?.id);
                                                            await refresh();
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {selected && (group.pendingInvites?.length ?? 0) > 0 ? (
                                                <div className="mt-4 grid gap-2 border-t border-border pt-4">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Invitaciones externas</p>
                                                    {group.pendingInvites?.map((invite) => (
                                                        <PendingInviteRow
                                                            key={invite.id}
                                                            groupId={group.id}
                                                            invite={invite}
                                                            refresh={async () => {
                                                                if (activeMariachi?.id) await loadMusicianGroups(activeMariachi?.id);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ) : null}
                                        </PanelCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <ProviderMembersSection
                        mariachi={activeMariachi}
                        members={providerMembers}
                        pendingInvites={providerMemberInvites}
                        musicianGroups={musicianGroups}
                        musicians={musicians}
                        loading={providerMembersLoading}
                        error={providerMembersError}
                        addingMusicianId={addingMusicianId}
                        draggingMusicianId={draggingMusicianId}
                        onDragStart={(musicianId) => setDraggingMusicianId(musicianId)}
                        onDragEnd={() => setDraggingMusicianId(null)}
                        onInviteToBank={(musicianId) => void inviteRegisteredMusicianToBank(musicianId)}
                        onInvite={() => setProviderMemberInviteOpen(true)}
                        onOpenProfile={(musicianId) => setProfileMusicianId(musicianId)}
                        musicianById={musicianById}
                        refresh={async () => {
                            if (activeMariachi?.id) await loadProviderMembers(activeMariachi?.id);
                            if (activeMariachi?.id) await loadProviderMemberInvites(activeMariachi?.id);
                            await refresh();
                        }}
                    />
                </div>
            )}

            {providerMemberInviteOpen && activeMariachi ? (
                <InviteProviderMemberModal
                    mariachi={activeMariachi}
                    onClose={() => setProviderMemberInviteOpen(false)}
                    refresh={async () => {
                        if (activeMariachi?.id) await loadProviderMembers(activeMariachi?.id);
                        if (activeMariachi?.id) await loadProviderMemberInvites(activeMariachi?.id);
                        await refresh();
                    }}
                />
            ) : null}

            {editGroup ? (
                <EditGroupModal
                    group={editGroup}
                    onClose={() => setEditGroup(null)}
                    onSaved={async () => {
                        if (activeMariachi?.id) await loadMusicianGroups(activeMariachi?.id);
                        await refresh();
                    }}
                />
            ) : null}

            {createOpen && activeMariachi ? (
                <CreateMusicianGroupModal
                    mariachi={activeMariachi}
                    onClose={() => setCreateOpen(false)}
                    onCreated={async (group) => {
                        if (activeMariachi?.id) await loadMusicianGroups(activeMariachi?.id);
                        setActiveMusicianGroupId(group.id);
                        await refresh();
                    }}
                />
            ) : null}

            {profileMusicianId ? (
                <MusicianProfileModal
                    musicianId={profileMusicianId}
                    onClose={() => setProfileMusicianId(null)}
                />
            ) : null}
        </div>
    );
}

/** Un solo tag de estado en el roster (evita “Activo” + “Disponible” a la vez). */
function providerMemberRosterBadge(member: Pick<ProviderGroupMember, 'status' | 'availableNow'>): {
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
    if (member.status === 'invited') return { label: 'Pendiente', tone: 'warning' };
    if (member.status === 'rejected') return { label: 'Rechazado', tone: 'danger' };
    if (member.status === 'removed') return { label: 'Quitado', tone: 'danger' };
    if (member.availableNow) return { label: 'Disponible', tone: 'success' };
    return { label: 'No disponible', tone: 'neutral' };
}

function mergeProviderMemberProfile(
    member: ProviderGroupMember,
    musicianById: Map<string, MusicianDirectoryItem>,
): MusicianPublicProfile {
    const directory = musicianById.get(member.musicianId);
    return toMusicianPublicProfile({
        id: member.id,
        musicianId: member.musicianId,
        userId: directory?.userId,
        name: member.musicianName ?? directory?.name,
        avatarUrl: member.avatarUrl ?? directory?.avatarUrl,
        instrument: member.instrument ?? directory?.instrument,
        instruments: member.instruments?.length ? member.instruments : directory?.instruments,
        bio: member.bio ?? directory?.bio,
        comuna: member.comuna ?? directory?.comuna,
        region: member.region ?? directory?.region,
        workZones: member.workZones ?? directory?.workZones,
        experienceYears: member.experienceYears ?? directory?.experienceYears,
        availableNow: member.availableNow ?? directory?.availableNow,
        isAvailable: directory?.isAvailable,
    });
}

function ProviderMembersSection({
    mariachi,
    members,
    pendingInvites,
    musicianGroups,
    musicians,
    musicianById,
    loading,
    error,
    refresh,
    onInvite,
    onOpenProfile,
    addingMusicianId,
    draggingMusicianId,
    onDragStart,
    onDragEnd,
    onInviteToBank,
}: {
    mariachi: ProviderGroup;
    members: ProviderGroupMember[];
    pendingInvites: ProviderGroupMemberInvite[];
    musicianGroups: SerenataGroup[];
    musicians: MusicianDirectoryItem[];
    musicianById: Map<string, MusicianDirectoryItem>;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    onInvite: () => void;
    onOpenProfile: (musicianId: string) => void;
    addingMusicianId: string | null;
    draggingMusicianId: string | null;
    onDragStart: (musicianId: string) => void;
    onDragEnd: () => void;
    onInviteToBank: (musicianId: string) => void;
}) {
    const rosterMembers = members.filter((member) => member.status === 'active');
    const pendingMembers = members.filter((member) => member.status === 'invited');
    const groupCountByMusician = new Map<string, number>();
    musicianGroups.forEach((group) => {
        group.members
            .filter((member) => ['accepted', 'invited'].includes(member.status))
            .forEach((member) => {
                groupCountByMusician.set(member.musicianId, (groupCountByMusician.get(member.musicianId) ?? 0) + 1);
            });
    });
    const linkedMusicianIds = new Set(
        members
            .filter((member) => !['removed', 'rejected'].includes(member.status))
            .map((member) => member.musicianId),
    );
    const appCandidates = musicians
        .filter((musician) => !linkedMusicianIds.has(musician.id))
        .sort((a, b) => Number(b.availableNow) - Number(a.availableNow) || a.name.localeCompare(b.name));
    const hasPending = pendingMembers.length > 0 || pendingInvites.length > 0;
    const isEmpty = rosterMembers.length === 0 && !hasPending && appCandidates.length === 0;

    return (
        <div className="grid content-start gap-5 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Músicos
                </p>
                <PanelButton variant="secondary" size="sm" onClick={onInvite}>
                    <IconUserPlus size={14} />
                    Invitar músico
                </PanelButton>
            </div>

            {loading ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={16} className="animate-spin" />
                    Cargando músicos…
                </p>
            ) : error ? (
                <PanelNotice tone="error">{error}</PanelNotice>
            ) : isEmpty ? (
                <PanelEmptyState
                    title="Sin músicos en el mariachi"
                    description="Invita músicos al mariachi. Cuando acepten, podrás arrastrarlos a los grupos."
                    action={
                        <PanelButton variant="secondary" size="sm" onClick={onInvite}>
                            <IconUserPlus size={14} />
                            Invitar músico
                        </PanelButton>
                    }
                />
            ) : (
                <>
                    <PanelCard size="md">
                        {rosterMembers.length === 0 ? (
                                <p className="text-sm text-fg-muted">
                                    Aún no hay músicos confirmados. Invita integrantes o espera que acepten la invitación.
                                </p>
                            ) : (
                                <div className="grid gap-3">
                                    {rosterMembers.map((member) => {
                                        const profile = mergeProviderMemberProfile(member, musicianById);
                                        return (
                                            <ProviderMemberRow
                                                key={member.id}
                                                mariachi={mariachi}
                                                member={member}
                                                profile={profile}
                                                refresh={refresh}
                                                draggable={member.status === 'active'}
                                                isDragging={draggingMusicianId === member.musicianId}
                                                onDragStart={() => onDragStart(member.musicianId)}
                                                onDragEnd={onDragEnd}
                                                onOpenProfile={() => onOpenProfile(member.musicianId)}
                                            >
                                                {member.status === 'active' && (groupCountByMusician.get(member.musicianId) ?? 0) > 0 ? (
                                                    <span className="text-xs tabular-nums text-fg-muted">
                                                        {groupCountByMusician.get(member.musicianId)} grupo{(groupCountByMusician.get(member.musicianId) ?? 0) === 1 ? '' : 's'}
                                                    </span>
                                                ) : null}
                                            </ProviderMemberRow>
                                        );
                                    })}
                                </div>
                            )}
                    </PanelCard>

                    {hasPending ? (
                        <div className="grid gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                                Pendientes
                            </p>
                            <PanelCard size="md">
                                <div className="grid gap-3">
                                    {pendingMembers.map((member) => {
                                        const profile = mergeProviderMemberProfile(member, musicianById);
                                        return (
                                            <ProviderMemberRow
                                                key={member.id}
                                                mariachi={mariachi}
                                                member={member}
                                                profile={profile}
                                                refresh={refresh}
                                                onOpenProfile={() => onOpenProfile(member.musicianId)}
                                            />
                                        );
                                    })}
                                    {pendingInvites.map((invite) => (
                                        <PendingProviderMemberInviteRow
                                            key={invite.id}
                                            mariachiId={mariachi.id}
                                            invite={invite}
                                            refresh={refresh}
                                        />
                                    ))}
                                </div>
                            </PanelCard>
                        </div>
                    ) : null}

                    <div className="grid gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                            Disponibles en la app
                        </p>
                        <PanelCard size="md">
                            {appCandidates.length === 0 ? (
                                <p className="text-sm text-fg-muted">
                                    No hay más músicos registrados. Usa “Invitar músico” para sumar por correo o WhatsApp.
                                </p>
                            ) : (
                                <div className="grid gap-2">
                                    {appCandidates.slice(0, 8).map((musician) => (
                                        <MusicianSummaryCard
                                            key={musician.id}
                                            musicianId={musician.id}
                                            profile={toMusicianPublicProfile(musician)}
                                            onOpenProfile={() => onOpenProfile(musician.id)}
                                            trailing={
                                                <PanelButton
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={addingMusicianId === musician.id}
                                                    onClick={() => onInviteToBank(musician.id)}
                                                >
                                                    {addingMusicianId === musician.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconUserPlus size={14} />}
                                                    Invitar
                                                </PanelButton>
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </PanelCard>
                    </div>
                </>
            )}
        </div>
    );
}

function PendingProviderMemberInviteRow({
    mariachiId,
    invite,
    refresh,
}: {
    mariachiId: string;
    invite: ProviderGroupMemberInvite;
    refresh: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const label = invite.displayName ?? invite.email ?? invite.phone ?? 'Invitado';
    const channel = invite.email && invite.phone
        ? 'Correo y WhatsApp'
        : invite.email
          ? 'Correo enviado'
          : 'WhatsApp';

    async function cancel() {
        setBusy(true);
        await serenatasApi.cancelProviderGroupMemberInvite(mariachiId, invite.id);
        await refresh();
        setBusy(false);
    }

    return (
        <div className="rounded-xl border border-border bg-bg-subtle p-3">
            <div className="flex items-center gap-3">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bg-subtle text-fg-muted ring-1 ring-border"
                    aria-hidden
                >
                    <IconUser size={20} stroke={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold leading-tight text-fg">{label}</p>
                        <PanelStatusBadge tone="warning" label="Pendiente" size="xs" />
                    </div>
                    <p className="mt-1 truncate text-xs text-fg-muted">{channel}</p>
                </div>
                <ProviderMemberCompactRemoveButton
                    busy={busy}
                    label={`Cancelar invitación a ${label}`}
                    confirm={{
                        title: 'Cancelar invitación',
                        message: `¿Cancelar la invitación a ${label}? Ya no podrá unirse al mariachi con este enlace.`,
                        confirmLabel: 'Cancelar invitación',
                        tone: 'danger',
                    }}
                    onClick={() => void cancel()}
                />
            </div>
        </div>
    );
}

function ProviderMemberCompactRemoveButton({
    busy,
    label,
    confirm,
    onClick,
}: {
    busy: boolean;
    label: string;
    confirm?: PanelConfirmOptions;
    onClick: () => void;
}) {
    const { confirm: askConfirm } = usePanelConfirm();

    async function handleClick() {
        if (confirm) {
            const confirmed = await askConfirm(confirm);
            if (!confirmed) return;
        }
        onClick();
    }

    return (
        <button
            type="button"
            disabled={busy}
            aria-label={label}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:border-danger/35 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            onClick={() => void handleClick()}
        >
            {busy ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={15} aria-hidden />}
        </button>
    );
}

function ProviderMemberRow({
    mariachi,
    member,
    profile,
    refresh,
    children,
    draggable = false,
    isDragging = false,
    onDragStart,
    onDragEnd,
    onOpenProfile,
}: {
    mariachi: ProviderGroup;
    member: ProviderGroupMember;
    profile: MusicianPublicProfile;
    refresh: () => Promise<void>;
    children?: ReactNode;
    draggable?: boolean;
    isDragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onOpenProfile?: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const rosterBadge = providerMemberRosterBadge(member);

    async function removeFromMariachi() {
        setBusy(true);
        await serenatasApi.updateProviderGroupMember(mariachi.id, member.id, { status: 'removed' });
        await refresh();
        setBusy(false);
    }

    const removeConfirm: PanelConfirmOptions =
        member.status === 'invited'
            ? {
                  title: 'Quitar invitación',
                  message: `¿Quitar la invitación a ${profile.name}? Ya no podrá unirse al mariachi hasta que lo invites de nuevo.`,
                  confirmLabel: 'Quitar',
                  tone: 'danger',
              }
            : {
                  title: 'Quitar del mariachi',
                  message: `¿Quitar a ${profile.name} del mariachi? Dejará de aparecer en tu banco y no podrás asignarlo a grupos.`,
                  confirmLabel: 'Quitar',
                  tone: 'danger',
              };

    return (
        <MusicianSummaryCard
            profile={profile}
            musicianId={member.musicianId}
            draggable={draggable}
            isDragging={isDragging}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onOpenProfile={onOpenProfile}
            statusBadge={<PanelStatusBadge tone={rosterBadge.tone} label={rosterBadge.label} size="xs" />}
            trailing={
                children ?? (
                    member.status !== 'removed' ? (
                        <ProviderMemberCompactRemoveButton
                            busy={busy}
                            label={
                                member.status === 'invited'
                                    ? `Quitar invitación a ${profile.name}`
                                    : `Quitar a ${profile.name} del mariachi`
                            }
                            confirm={removeConfirm}
                            onClick={() => void removeFromMariachi()}
                        />
                    ) : null
                )
            }
        />
    );
}

function InviteProviderMemberModal({
    mariachi,
    refresh,
    onClose,
}: {
    mariachi: ProviderGroup;
    refresh: () => Promise<void>;
    onClose: () => void;
}) {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function submit() {
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();
        if (!trimmedEmail && !trimmedPhone) {
            setStatus({ loading: false, error: 'Indica al menos correo o WhatsApp.', ok: null });
            return;
        }
        if (trimmedPhone) {
            const phoneError = validateChileMobilePhone(trimmedPhone);
            if (phoneError) {
                setStatus({ loading: false, error: phoneError, ok: null });
                return;
            }
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.inviteProviderGroupExternalMember(mariachi.id, {
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            displayName: displayName.trim() || null,
            message: message.trim() || null,
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos enviar la invitación.', ok: null });
            return;
        }
        if (response.emailSent === false && response.signupUrl) {
            setStatus({
                loading: false,
                error: null,
                ok: `Correo no configurado en desarrollo. Comparte este enlace: ${response.signupUrl}`,
            });
            if (response.whatsappUrl) {
                window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
                await refresh();
                onClose();
            } else {
                await refresh();
            }
            return;
        }
        if (response.whatsappUrl) {
            window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
        await refresh();
        onClose();
    }

    return (
        <PanelSheet onClose={onClose} ariaLabel="Invitar músico" maxWidthClass="sm:max-w-md">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-fg">Invitar músico</h2>
                        <p className="mt-0.5 text-sm text-fg-muted">Indica correo, WhatsApp o ambos para contactarlo.</p>
                    </div>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>
                <div className="mt-5 grid gap-3">
                    <PanelField label="Nombre" hint="Opcional.">
                        <FieldInput
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            placeholder="Nombre del músico"
                        />
                    </PanelField>
                    <PanelField label="Correo" hint="Al menos correo o WhatsApp.">
                        <FieldInput
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="musico@ejemplo.com"
                        />
                    </PanelField>
                    <PanelField label="WhatsApp" hint={formatChileMobileHint()}>
                        <FieldInput
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="+56 9 1234 5678"
                        />
                    </PanelField>
                    <PanelField label="Mensaje" hint="Opcional.">
                        <FieldInput
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Invitación para integrar mi mariachi"
                        />
                    </PanelField>
                    <FormFeedback status={status} />
                    <PanelButton disabled={status.loading} onClick={() => void submit()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconUserPlus size={14} />}
                        Enviar invitación
                    </PanelButton>
                </div>
            </PanelCard>
        </PanelSheet>
    );
}

const DEFAULT_GROUP_INSTRUMENTS = ['Voz principal', 'Guitarra', 'Guitarrón'];

function RequiredInstrumentsEditor({
    slots,
    onChange,
}: {
    slots: string[];
    onChange: (next: string[]) => void;
}) {
    function updateSlot(index: number, value: string) {
        const next = [...slots];
        next[index] = value;
        onChange(next);
    }

    function moveSlot(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= slots.length) return;
        const next = [...slots];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    return (
        <div className="grid gap-2">
            {slots.map((slot, index) => (
                <div key={`instrument-slot-${index}`} className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle ring-1 ring-border">
                        <MusicianInstrumentIcon instrument={slot || 'Otros'} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <InstrumentSelect value={slot} onChange={(value) => updateSlot(index, value)} />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                        <button
                            type="button"
                            className="rounded-lg border border-border p-1 text-fg-muted disabled:opacity-40"
                            disabled={index === 0}
                            onClick={() => moveSlot(index, -1)}
                            aria-label="Subir instrumento"
                        >
                            <IconArrowUp size={14} />
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-border p-1 text-fg-muted disabled:opacity-40"
                            disabled={index === slots.length - 1}
                            onClick={() => moveSlot(index, 1)}
                            aria-label="Bajar instrumento"
                        >
                            <IconArrowDown size={14} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className="rounded-lg border border-border px-2 py-1 text-xs text-fg-muted disabled:opacity-40"
                        disabled={slots.length <= 1}
                        onClick={() => onChange(slots.filter((_, slotIndex) => slotIndex !== index))}
                    >
                        Quitar
                    </button>
                </div>
            ))}
            <PanelButton
                variant="secondary"
                size="sm"
                disabled={slots.length >= 40}
                onClick={() => onChange([...slots, ''])}
            >
                <IconPlus size={14} />
                Agregar cupo
            </PanelButton>
        </div>
    );
}

function GroupInstrumentSlotRow({
    slot,
    draggingMusicianId,
    musicianById,
    onDropMusician,
    onOpenProfile,
    onRemoveMember,
}: {
    slot: GroupInstrumentSlot;
    draggingMusicianId: string | null;
    musicianById: Map<string, MusicianDirectoryItem>;
    onDropMusician: (musicianId: string) => void;
    onOpenProfile: (musicianId: string) => void;
    onRemoveMember: (member: SerenataGroupMember) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const canDrop = Boolean(draggingMusicianId) && !slot.member;
    const member = slot.member;

    useEffect(() => {
        if (!draggingMusicianId) setIsDragOver(false);
    }, [draggingMusicianId]);

    function handleDragEnter(event: DragEvent<HTMLDivElement>) {
        if (!canDrop) return;
        event.preventDefault();
        setIsDragOver(true);
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragOver(false);
        }
    }

    if (member) {
        const directory = musicianById.get(member.musicianId);
        const profile = toMusicianPublicProfile({
            id: member.id,
            musicianId: member.musicianId,
            name: member.musicianName ?? directory?.name,
            avatarUrl: member.avatarUrl ?? directory?.avatarUrl,
            instrument: slot.instrument,
            instruments: member.instruments ?? directory?.instruments,
            comuna: member.comuna ?? directory?.comuna,
            region: member.region ?? directory?.region,
            workZones: directory?.workZones,
            availableNow: member.availableNow ?? directory?.availableNow,
            isAvailable: directory?.isAvailable,
            userId: directory?.userId,
        });
        const rosterBadge = groupMemberRosterBadge(member);

        return (
            <div className="rounded-xl border border-border bg-bg-subtle p-2.5">
                <div className="mb-2 flex items-center gap-2 px-0.5">
                    <MusicianInstrumentIcon instrument={slot.instrument} size={15} />
                    <span className="min-w-0 truncate text-xs font-medium text-fg-muted">{slot.instrument}</span>
                </div>
                <MusicianSummaryCard
                    profile={profile}
                    musicianId={member.musicianId}
                    hideMeta
                    onOpenProfile={() => onOpenProfile(member.musicianId)}
                    statusBadge={<PanelStatusBadge tone={rosterBadge.tone} label={rosterBadge.label} size="xs" />}
                    trailing={
                        member.status !== 'cancelled' ? (
                            <ProviderMemberCompactRemoveButton
                                busy={busy}
                                label={`Quitar a ${profile.name} del cupo`}
                                confirm={{
                                    title: 'Quitar del cupo',
                                    message: `¿Quitar a ${profile.name} de este cupo (${slot.instrument})?`,
                                    confirmLabel: 'Quitar',
                                    tone: 'danger',
                                }}
                                onClick={() => {
                                    setBusy(true);
                                    void onRemoveMember(member).finally(() => setBusy(false));
                                }}
                            />
                        ) : null
                    }
                />
            </div>
        );
    }

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(event) => {
                if (!canDrop) return;
                event.preventDefault();
            }}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const musicianId = event.dataTransfer.getData('text/plain') || draggingMusicianId;
                if (!musicianId || !canDrop) return;
                onDropMusician(musicianId);
            }}
            aria-label={canDrop ? `Soltar músico en cupo de ${slot.instrument}` : `Cupo de ${slot.instrument}`}
            className={[
                'flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-colors',
                isDragOver ? 'border-accent bg-accent-soft/50' : 'border-border/80 bg-bg-subtle/40',
            ].join(' ')}
        >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle">
                <MusicianInstrumentIcon instrument={slot.instrument} size={18} />
            </div>
            <p className="min-w-0 truncate text-sm font-medium text-fg">{slot.instrument}</p>
        </div>
    );
}

function EditGroupModal({
    group,
    onClose,
    onSaved,
}: {
    group: SerenataGroup;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [name, setName] = useState(group.name);
    const [slots, setSlots] = useState(() => groupRequiredInstruments(group));
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function save() {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            setStatus({ loading: false, error: 'Indica un nombre de al menos 2 caracteres.', ok: null });
            return;
        }
        const normalized = slots.map((item) => item.trim()).filter(Boolean);
        if (normalized.length < 1) {
            setStatus({ loading: false, error: 'Agrega al menos un cupo (instrumento).', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateGroup(group.id, {
            name: trimmedName,
            requiredInstruments: normalized,
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos guardar los cambios.', ok: null });
            return;
        }
        await onSaved();
        onClose();
    }

    return (
        <PanelSheet onClose={onClose} ariaLabel="Editar grupo" maxWidthClass="sm:max-w-lg">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-fg">Editar grupo</h2>
                        <p className="mt-1 text-sm text-fg-muted">Nombre, cupos e instrumentos en el orden que se muestran.</p>
                    </div>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>
                <div className="mt-5 grid gap-4">
                    <PanelField label="Nombre del grupo">
                        <FieldInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Trío base, Cuarteto viernes"
                        />
                    </PanelField>
                    <PanelField
                        label="Cupos del grupo"
                        hint="Cada fila es un cupo. Puedes agregar, quitar o reordenar. No exige que el músico toque ese instrumento como principal."
                    >
                        <RequiredInstrumentsEditor slots={slots} onChange={setSlots} />
                    </PanelField>
                    <FormFeedback status={status} />
                    <PanelButton disabled={status.loading} onClick={() => void save()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : 'Guardar cambios'}
                    </PanelButton>
                </div>
            </PanelCard>
        </PanelSheet>
    );
}

function CreateMusicianGroupModal({
    mariachi,
    onClose,
    onCreated,
}: {
    mariachi: ProviderGroup;
    onClose: () => void;
    onCreated: (group: SerenataGroup) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [slots, setSlots] = useState<string[]>(DEFAULT_GROUP_INSTRUMENTS);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function create() {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            setStatus({ loading: false, error: 'Indica un nombre de al menos 2 caracteres.', ok: null });
            return;
        }
        const requiredInstruments = slots.map((item) => item.trim()).filter(Boolean);
        if (requiredInstruments.length < 1) {
            setStatus({ loading: false, error: 'Agrega al menos un instrumento requerido.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.createGroup({
            name: trimmed,
            status: 'draft',
            providerGroupId: mariachi.id,
            requiredInstruments,
            maxMusicians: requiredInstruments.length,
            date: new Date().toISOString().slice(0, 10),
        });
        if (!response.ok || !response.item) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos crear el grupo.', ok: null });
            return;
        }
        await onCreated(response.item);
        onClose();
    }

    return (
        <PanelSheet onClose={onClose} ariaLabel="Nuevo grupo de músicos" maxWidthClass="sm:max-w-lg">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-fg">Nuevo grupo de músicos</h2>
                        <p className="mt-1 text-sm text-fg-muted">Para {mariachi.name}. Define los instrumentos en el orden que quieres ver los cupos.</p>
                    </div>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>
                <div className="mt-5 grid gap-4">
                    <PanelField label="Nombre del grupo">
                        <FieldInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Trío base, Cuarteto viernes"
                        />
                    </PanelField>
                    <PanelField label="Instrumentos requeridos" hint="No es obligatorio que el músico tenga ese instrumento como principal; sirve para organizar el grupo.">
                        <RequiredInstrumentsEditor slots={slots} onChange={setSlots} />
                    </PanelField>
                    <FormFeedback status={status} />
                    <PanelButton disabled={status.loading} onClick={() => void create()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlus size={15} />}
                        Crear grupo
                    </PanelButton>
                </div>
            </PanelCard>
        </PanelSheet>
    );
}

function groupMemberRosterBadge(member: Pick<SerenataGroupMember, 'status' | 'availableNow'>): {
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
    if (member.status === 'cancelled') return { label: 'Cancelado', tone: 'neutral' };
    if (member.status === 'rejected') return { label: 'Rechazado', tone: 'danger' };
    if (member.status === 'invited') return { label: 'Invitado', tone: 'warning' };
    if (member.status === 'accepted' && member.availableNow) return { label: 'Disponible', tone: 'success' };
    if (member.status === 'accepted') return { label: 'Confirmado', tone: 'success' };
    return { label: member.status, tone: 'neutral' };
}

function PendingInviteRow({
    groupId,
    invite,
    refresh,
}: {
    groupId: string;
    invite: SerenataGroupPendingInvite;
    refresh: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const label = invite.email ?? invite.phone ?? 'Invitado';
    const channel = invite.email ? 'Correo enviado' : 'WhatsApp';

    async function cancel() {
        setBusy(true);
        await serenatasApi.cancelGroupInvite(groupId, invite.id);
        await refresh();
        setBusy(false);
    }

    const { confirm } = usePanelConfirm();

    async function handleCancelClick() {
        const confirmed = await confirm({
            title: 'Cancelar invitación',
            message: `¿Cancelar la invitación a ${label}? Ya no podrá unirse a este grupo con el enlace enviado.`,
            confirmLabel: 'Cancelar invitación',
            tone: 'danger',
        });
        if (!confirmed) return;
        void cancel();
    }

    return (
        <PanelCard size="sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-fg">{label}</p>
                        <PanelStatusBadge tone="warning" label="Pendiente" size="xs" />
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">{channel} · Esperando registro</p>
                </div>
                <PanelButton variant="secondary" size="sm" disabled={busy} onClick={handleCancelClick}>
                    Cancelar
                </PanelButton>
            </div>
        </PanelCard>
    );
}
