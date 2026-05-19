'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { IconLoader2, IconPlus, IconUserPlus, IconUsers, IconX } from '@tabler/icons-react';
import type { MusicianDirectoryItem, ProviderGroup, ProviderGroupMember } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { useProviderGroups } from '@/hooks/use-provider-groups';
import {
    persistActiveProviderGroupId,
    readSignupGroupName,
    resolveActiveProviderGroupId,
} from '@/lib/active-provider-group';
import { musicianLocationLabel } from '@/lib/musician-location-label';
import { PanelSheet } from './panel-sheet';
import { EmptyBlock, FieldInput, FieldSelect, FieldTextarea, FormFeedback, InstrumentSelect, type FormStatus } from './shared';
import { MusicianAvailabilityBadge } from './musician-availability-toggle';

export function GroupsView({
    musicians,
    refresh,
}: {
    musicians: MusicianDirectoryItem[];
    refresh: () => Promise<void>;
}) {
    const { groups, loading: groupsLoading, error: groupsError, refresh: refreshProviderGroups } = useProviderGroups();
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [members, setMembers] = useState<ProviderGroupMember[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });

    const activeGroup = useMemo(
        () => groups.find((g) => g.id === activeGroupId) ?? null,
        [groups, activeGroupId],
    );

    async function loadMembers(groupId: string) {
        const membersResponse = await serenatasApi.providerGroupMembers(groupId);
        if (!membersResponse.ok) {
            setMembers([]);
            setStatus({ loading: false, error: membersResponse.error ?? 'No pudimos cargar músicos.', ok: null });
            return false;
        }
        setMembers(membersResponse.items);
        return true;
    }

    async function syncMembersForGroups(items: typeof groups) {
        if (items.length === 0) {
            setActiveGroupId(null);
            setMembers([]);
            setStatus({ loading: false, error: null, ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const nextId = resolveActiveProviderGroupId(items);
        if (!nextId) {
            setStatus({ loading: false, error: null, ok: null });
            return;
        }
        persistActiveProviderGroupId(nextId);
        setActiveGroupId(nextId);
        const ok = await loadMembers(nextId);
        if (ok) setStatus({ loading: false, error: null, ok: null });
    }

    useEffect(() => {
        if (groupsLoading) return;
        if (groupsError) {
            setStatus({ loading: false, error: groupsError, ok: null });
            return;
        }
        void syncMembersForGroups(groups);
    }, [groups, groupsLoading, groupsError]);

    async function selectGroup(groupId: string) {
        persistActiveProviderGroupId(groupId);
        setActiveGroupId(groupId);
        setStatus({ loading: true, error: null, ok: null });
        await loadMembers(groupId);
        setStatus({ loading: false, error: null, ok: null });
    }

    const activeMembers = members.filter((member) => member.status === 'active');
    const pendingMembers = members.filter((member) => member.status === 'invited');

    if (status.loading && groups.length === 0) {
        return <p className="text-sm text-fg-muted">Cargando grupos…</p>;
    }

    if (groups.length === 0) {
        return (
            <>
                <PanelNotice tone="neutral" className="mb-1">
                    Aquí organizas el plantel de músicos con los que trabajas. Cada grupo comercial es un equipo
                    operativo distinto (por ejemplo, trío de fin de semana o plantel completo).
                </PanelNotice>
                <EmptyBlock
                    title="Sin grupos"
                    description="Crea tu primer grupo para invitar músicos y armar el plantel."
                />
                <div className="mt-4">
                    <PanelButton onClick={() => setCreateModalOpen(true)}>
                        <IconPlus size={16} />
                        Crear grupo
                    </PanelButton>
                </div>
                {createModalOpen ? (
                    <CreateGroupModal
                        defaultName={readSignupGroupName() ?? ''}
                        onClose={() => setCreateModalOpen(false)}
                        onCreated={async () => {
                            await refreshProviderGroups();
                            await refresh();
                        }}
                    />
                ) : null}
            </>
        );
    }

    return (
        <>
            <PanelNotice tone="neutral" className="mb-1">
                Organiza el plantel de cada grupo comercial con el que operas como dueño. No es el
                listado del marketplace para clientes (eso está en Perfil público).
            </PanelNotice>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--fg)]">Grupos</h2>
                    <p className="mt-1 text-sm text-fg-muted">
                        {groups.length} grupo{groups.length === 1 ? '' : 's'}
                        {activeGroup ? ` · ${activeGroup.name}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <PanelButton variant="secondary" onClick={() => setCreateModalOpen(true)}>
                        <IconPlus size={16} />
                        Nuevo grupo
                    </PanelButton>
                    {activeGroup ? (
                        <PanelButton onClick={() => setModalOpen(true)}>
                            <IconPlus size={16} />
                            Invitar músico
                        </PanelButton>
                    ) : null}
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => {
                    const selected = group.id === activeGroupId;
                    return (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => void selectGroup(group.id)}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                                selected
                                    ? 'border-accent bg-accent-soft'
                                    : 'border-border bg-bg-subtle hover:border-accent-border'
                            }`}
                        >
                            <p className="font-semibold text-[var(--fg)]">{group.name}</p>
                            <p className="mt-1 text-xs text-fg-muted">
                                {group.status === 'active' ? 'Activo en marketplace' : group.status}
                            </p>
                        </button>
                    );
                })}
            </div>

            {status.loading ? (
                <p className="mt-6 text-sm text-fg-muted">Cargando plantel…</p>
            ) : !activeGroup ? (
                <EmptyBlock title="Selecciona un grupo" description="Elige un grupo para ver e invitar músicos." />
            ) : (
                <>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-fg-muted">
                            {activeMembers.length} músicos activos · {pendingMembers.length} invitaciones pendientes
                        </p>
                        {groups.length > 1 ? (
                            <PanelField label="Grupo activo" className="mb-0 sm:max-w-xs">
                                <FieldSelect
                                    value={activeGroupId ?? ''}
                                    onChange={(event) => void selectGroup(event.target.value)}
                                >
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </FieldSelect>
                            </PanelField>
                        ) : null}
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <PanelCard>
                            {members.length === 0 ? (
                                <div className="flex min-h-[220px] items-center justify-center text-center">
                                    <EmptyBlock
                                        title="Sin músicos"
                                        description="Invita músicos para armar el plantel de este grupo."
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {members.map((member) => (
                                        <MemberRow
                                            key={member.id}
                                            groupId={activeGroup.id}
                                            member={member}
                                            refresh={async () => {
                                                await loadMembers(activeGroup.id);
                                                await refresh();
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </PanelCard>

                        <div className="grid content-start gap-5">
                            <PanelCard>
                                <h3 className="text-base font-semibold text-[var(--fg)]">Resumen</h3>
                                <div className="mt-5 grid gap-3">
                                    <Metric label="Activos" value={activeMembers.length} />
                                    <Metric label="Pendientes" value={pendingMembers.length} />
                                    <Metric label="Total" value={members.length} />
                                </div>
                            </PanelCard>
                            <PanelCard>
                                <h3 className="text-base font-semibold text-[var(--fg)]">Músicos disponibles</h3>
                                <div className="mt-4 grid gap-3">
                                    {musicians
                                        .filter((item) => item.availableNow)
                                        .slice(0, 5)
                                        .map((musician) => (
                                            <div
                                                key={musician.id}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-subtle p-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-[var(--fg)]">
                                                        {musician.name}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                                                        {musician.instrument ?? musician.instruments[0] ?? 'Músico'} ·{' '}
                                                        {musicianLocationLabel(musician)}
                                                    </p>
                                                </div>
                                                <MusicianAvailabilityBadge availableNow={musician.availableNow} />
                                            </div>
                                        ))}
                                </div>
                            </PanelCard>
                        </div>
                    </div>
                </>
            )}

            {modalOpen && activeGroup ? (
                <InviteMemberModal
                    group={activeGroup}
                    musicians={musicians}
                    existingMemberIds={members.map((member) => member.musicianId)}
                    onClose={() => setModalOpen(false)}
                    refresh={async () => {
                        await loadMembers(activeGroup.id);
                        await refresh();
                    }}
                />
            ) : null}

            {createModalOpen ? (
                <CreateGroupModal
                    defaultName={readSignupGroupName() ?? ''}
                    onClose={() => setCreateModalOpen(false)}
                    onCreated={async () => {
                        await refreshProviderGroups();
                        await refresh();
                    }}
                />
            ) : null}
        </>
    );
}

function CreateGroupModal({
    defaultName,
    onClose,
    onCreated,
}: {
    defaultName: string;
    onClose: () => void;
    onCreated: () => Promise<void>;
}) {
    const [name, setName] = useState(defaultName);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function create() {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            setStatus({ loading: false, error: 'Indica un nombre de al menos 2 caracteres.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.createProviderGroup({
            name: trimmed,
            status: 'draft',
        });
        if (!response.ok || !response.item) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos crear el grupo.', ok: null });
            return;
        }
        persistActiveProviderGroupId(response.item.id);
        await onCreated();
        onClose();
    }

    return (
        <PanelSheet onClose={onClose} ariaLabel="Nuevo grupo" maxWidthClass="sm:max-w-md">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="type-section-title text-[var(--fg)]">Nuevo grupo</h2>
                        <p className="mt-1 text-sm text-fg-muted">Grupo comercial y plantel operativo para tus músicos.</p>
                    </div>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>
                <div className="mt-5 grid gap-3">
                    <PanelField label="Nombre del grupo">
                        <FieldInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Trío fin de semana"
                        />
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

function MemberRow({
    groupId,
    member,
    refresh,
}: {
    groupId: string;
    member: ProviderGroupMember;
    refresh: () => Promise<void>;
}) {
    async function setStatus(next: ProviderGroupMember['status']) {
        await serenatasApi.updateProviderGroupMember(groupId, member.id, { status: next });
        await refresh();
    }

    const tone =
        member.status === 'active'
            ? 'success'
            : member.status === 'invited'
              ? 'warning'
              : member.status === 'rejected'
                ? 'danger'
                : 'neutral';

    return (
        <div className="rounded-xl border border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="font-semibold text-[var(--fg)]">{member.musicianName ?? 'Músico'}</p>
                    <p className="mt-1 text-sm text-fg-muted">
                        {(member.instruments.length > 0 ? member.instruments : [member.instrument ?? 'Instrumento']).join(
                            ', ',
                        )}
                        {member.comuna ? ` · ${member.comuna}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <MusicianAvailabilityBadge availableNow={Boolean(member.availableNow)} />
                    <PanelStatusBadge
                        tone={tone}
                        label={
                            member.status === 'active'
                                ? 'Activo'
                                : member.status === 'invited'
                                  ? 'Invitado'
                                  : member.status
                        }
                    />
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {member.status !== 'inactive' ? (
                    <PanelButton variant="secondary" onClick={() => void setStatus('inactive')}>
                        Pausar
                    </PanelButton>
                ) : (
                    <PanelButton variant="secondary" onClick={() => void setStatus('active')}>
                        Activar
                    </PanelButton>
                )}
                <PanelButton variant="secondary" onClick={() => void setStatus('removed')}>
                    Quitar
                </PanelButton>
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle p-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <IconUsers size={18} />
            </div>
            <div>
                <p className="text-xs text-fg-muted">{label}</p>
                <p className="text-lg font-semibold text-[var(--fg)]">{value}</p>
            </div>
        </div>
    );
}

function InviteMemberModal({
    group,
    musicians,
    existingMemberIds,
    refresh,
    onClose,
}: {
    group: ProviderGroup;
    musicians: MusicianDirectoryItem[];
    existingMemberIds: string[];
    refresh: () => Promise<void>;
    onClose: () => void;
}) {
    const options = useMemo(
        () =>
            musicians
                .filter((musician) => !existingMemberIds.includes(musician.id))
                .sort((a, b) => Number(b.availableNow) - Number(a.availableNow)),
        [existingMemberIds, musicians],
    );
    const [selectedMusician, setSelectedMusician] = useState(options[0]?.id ?? '');
    const [instrument, setInstrument] = useState(options[0]?.instrument ?? '');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function invite() {
        if (!selectedMusician) {
            setStatus({ loading: false, error: 'Selecciona un músico.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.inviteProviderGroupMember(group.id, {
            musicianId: selectedMusician,
            instruments: instrument ? [instrument] : [],
            message: message.trim() || null,
        });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos invitar al músico.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Invitación enviada.' });
        await refresh();
        onClose();
    }

    return (
        <PanelSheet onClose={onClose} ariaLabel="Invitar músico" maxWidthClass="sm:max-w-xl">
            <PanelCard size="lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="type-section-title text-[var(--fg)]">Invitar músico</h2>
                        <p className="mt-1 text-sm text-fg-muted">{group.name}</p>
                    </div>
                    <button type="button" className="rounded-xl bg-bg-subtle p-2 text-fg-muted" onClick={onClose}>
                        <IconX size={18} />
                    </button>
                </div>
                <div className="mt-5 grid gap-3">
                    <PanelField label="Músico">
                        <FieldSelect
                            value={selectedMusician}
                            onChange={(event) => {
                                const musician = musicians.find((item) => item.id === event.target.value);
                                setSelectedMusician(event.target.value);
                                setInstrument(musician?.instrument ?? '');
                            }}
                        >
                            <option value="">Seleccionar</option>
                            {options.map((musician) => (
                                <option key={musician.id} value={musician.id}>
                                    {musician.name} · {musician.instrument ?? musician.instruments[0] ?? 'Músico'} ·{' '}
                                    {musician.availableNow ? 'Disponible' : 'No disponible'}
                                </option>
                            ))}
                        </FieldSelect>
                    </PanelField>
                    <PanelField label="Instrumento">
                        <InstrumentSelect value={instrument} onChange={setInstrument} />
                    </PanelField>
                    <PanelField label="Mensaje">
                        <FieldTextarea rows={2} value={message} onChange={(event) => setMessage(event.target.value)} />
                    </PanelField>
                    <FormFeedback status={status} />
                    <PanelButton disabled={status.loading || options.length === 0} onClick={() => void invite()}>
                        {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconUserPlus size={15} />}
                        Enviar invitación
                    </PanelButton>
                </div>
            </PanelCard>
        </PanelSheet>
    );
}
