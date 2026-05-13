'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { IconCalendar, IconLoader2, IconMusic, IconPlus, IconTrendingUp, IconUsers, IconUserPlus, IconX } from '@tabler/icons-react';
import type { MusicianDirectoryItem, SerenataGroup } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { EmptyBlock, FieldInput, FieldSelect, FieldTextarea, FormFeedback, InstrumentSelect, formatDate, today, type FormStatus } from './shared';

export function GroupsView({ groups, musicians, refresh }: { groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; refresh: () => Promise<void> }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [prefillGroupId, setPrefillGroupId] = useState('');
    const activeGroups = groups.filter((group) => group.status === 'active');
    const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
    const acceptedMembers = groups.reduce((sum, group) => sum + group.members.filter((member) => member.status === 'accepted').length, 0);
    const pendingMembers = groups.reduce((sum, group) => sum + group.members.filter((member) => member.status === 'invited').length, 0);
    const nearbyMusicians = musicians.filter((musician) => musician.availableNow || musician.isAvailable).slice(0, 5);

    function openModal(groupId = '') {
        setPrefillGroupId(groupId);
        setModalOpen(true);
    }

    return (
        <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Mis grupos</h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{activeGroups.length} grupos activos</p>
                </div>
                <PanelButton onClick={() => openModal()}>
                    <IconPlus size={16} />
                    Crear grupo
                </PanelButton>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0">
                    {groups.length === 0 ? (
                        <PanelCard className="flex min-h-[230px] items-center justify-center text-center">
                            <div>
                                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                                    <IconUsers size={34} />
                                </div>
                                <EmptyBlock title="No tienes grupos activos" description="Crea un grupo para organizar serenatas." />
                            </div>
                        </PanelCard>
                    ) : (
                        <div className="grid gap-3">
                            {groups.map((group) => (
                                <GroupCard key={group.id} group={group} onInvite={() => openModal(group.id)} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid content-start gap-5">
                    <PanelCard>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Resumen</h3>
                        <div className="mt-5 grid gap-5">
                            <SummaryRow icon={<IconUsers size={20} />} label="Total grupos" value={groups.length} />
                            <SummaryRow icon={<IconTrendingUp size={20} />} label="Músicos confirmados" value={acceptedMembers} />
                            <SummaryRow icon={<IconUserPlus size={20} />} label="Invitaciones pendientes" value={pendingMembers} />
                        </div>
                    </PanelCard>

                    <PanelCard>
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Músicos cerca</h3>
                            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{nearbyMusicians.length}</span>
                        </div>
                        <div className="mt-5 grid gap-3">
                            {nearbyMusicians.length === 0 ? (
                                <p className="py-8 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>No hay músicos disponibles cerca</p>
                            ) : nearbyMusicians.map((musician) => (
                                <div key={musician.id} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{musician.name}</p>
                                        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--fg-muted)' }}>{musician.instrument ?? musician.instruments[0] ?? 'Músico'} · {musician.comuna ?? 'Sin comuna'}</p>
                                    </div>
                                    <PanelStatusBadge tone={musician.availableNow ? 'success' : 'neutral'} label={musician.availableNow ? 'Ahora' : 'Disponible'} size="sm" />
                                </div>
                            ))}
                        </div>
                    </PanelCard>
                </div>
            </div>

            {modalOpen ? (
                <GroupManageModal
                    groups={groups}
                    musicians={musicians}
                    initialGroupId={prefillGroupId}
                    refresh={refresh}
                    onClose={() => setModalOpen(false)}
                />
            ) : null}
        </>
    );
}

function GroupCard({ group, onInvite }: { group: SerenataGroup; onInvite: () => void }) {
    const accepted = group.members.filter((member) => member.status === 'accepted').length;
    const invited = group.members.filter((member) => member.status === 'invited').length;

    return (
        <PanelCard className="transition-colors">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold" style={{ color: 'var(--fg)' }}>{group.name}</h3>
                        <PanelStatusBadge tone={group.status === 'active' ? 'success' : 'neutral'} label={group.status === 'active' ? 'Activo' : group.status} size="sm" />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        <IconCalendar size={15} />
                        {formatDate(group.date)}
                    </p>
                </div>
                <PanelButton variant="secondary" onClick={onInvite}>
                    <IconUserPlus size={15} />
                    Invitar músico
                </PanelButton>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <GroupMetric label="Integrantes" value={group.members.length} />
                <GroupMetric label="Confirmados" value={accepted} />
                <GroupMetric label="Pendientes" value={invited} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {group.members.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin integrantes todavía.</span>
                ) : group.members.map((member) => (
                    <span key={member.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                        <IconMusic size={14} />
                        {member.musicianName ?? 'Músico'} · {member.instrument ?? 'Instrumento'}
                    </span>
                ))}
            </div>
        </PanelCard>
    );
}

function GroupMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {icon}
            </div>
            <div>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                <p className="mt-0.5 text-lg font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            </div>
        </div>
    );
}

function GroupManageModal({ groups, musicians, initialGroupId, refresh, onClose }: { groups: SerenataGroup[]; musicians: MusicianDirectoryItem[]; initialGroupId: string; refresh: () => Promise<void>; onClose: () => void }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState(today);
    const [selectedGroup, setSelectedGroup] = useState(initialGroupId);
    const [selectedMusician, setSelectedMusician] = useState('');
    const [instrument, setInstrument] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const selectedMusicianProfile = useMemo(() => musicians.find((item) => item.id === selectedMusician), [musicians, selectedMusician]);

    useEffect(() => {
        if (selectedMusicianProfile?.instrument) setInstrument(selectedMusicianProfile.instrument);
    }, [selectedMusicianProfile]);

    async function createGroup() {
        if (name.trim().length < 2) {
            setStatus({ loading: false, error: 'Escribe un nombre para el grupo.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.createGroup({ name: name.trim(), date, status: 'active' });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos crear el grupo.', ok: null });
            return;
        }
        setName('');
        setSelectedGroup(response.item.id);
        setStatus({ loading: false, error: null, ok: 'Grupo creado.' });
        await refresh();
    }

    async function invite() {
        if (!selectedGroup || !selectedMusician) {
            setStatus({ loading: false, error: 'Selecciona grupo y músico.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.inviteMember(selectedGroup, { musicianId: selectedMusician, instrument, message });
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos invitar al músico.', ok: null });
            return;
        }
        setSelectedMusician('');
        setMessage('');
        setStatus({ loading: false, error: null, ok: 'Invitación enviada.' });
        await refresh();
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Gestionar grupo">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 cursor-default"
                style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)' }}
                onClick={onClose}
            />
            <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl sm:max-w-2xl sm:rounded-3xl">
                <PanelCard size="lg">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Gestionar grupo</h2>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Crea grupos e invita músicos desde el mismo flujo.</p>
                        </div>
                        <button type="button" className="rounded-xl p-2" style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }} onClick={onClose}>
                            <IconX size={18} />
                        </button>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Crear grupo</h3>
                            <div className="mt-4 grid gap-3">
                                <PanelField label="Nombre"><FieldInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Viernes noche" /></PanelField>
                                <PanelField label="Fecha"><FieldInput type="date" value={date} onChange={(event) => setDate(event.target.value)} /></PanelField>
                                <PanelButton disabled={status.loading} onClick={() => void createGroup()}>
                                    {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPlus size={15} />}
                                    Crear grupo
                                </PanelButton>
                            </div>
                        </div>

                        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Invitar músico</h3>
                            <div className="mt-4 grid gap-3">
                                <PanelField label="Grupo">
                                    <FieldSelect value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
                                        <option value="">Seleccionar</option>
                                        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                                    </FieldSelect>
                                </PanelField>
                                <PanelField label="Músico">
                                    <FieldSelect value={selectedMusician} onChange={(event) => setSelectedMusician(event.target.value)}>
                                        <option value="">Seleccionar</option>
                                        {musicians.map((musician) => <option key={musician.id} value={musician.id}>{musician.name} · {musician.instrument ?? musician.instruments[0] ?? 'Músico'}</option>)}
                                    </FieldSelect>
                                </PanelField>
                                <PanelField label="Instrumento"><InstrumentSelect value={instrument} onChange={setInstrument} /></PanelField>
                                <PanelField label="Mensaje"><FieldTextarea rows={2} value={message} onChange={(event) => setMessage(event.target.value)} /></PanelField>
                                <PanelButton disabled={status.loading} onClick={() => void invite()}>
                                    {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconUserPlus size={15} />}
                                    Enviar invitación
                                </PanelButton>
                            </div>
                        </div>
                    </div>

                    {groups.length === 0 ? <PanelNotice className="mt-5">Crea un grupo antes de invitar músicos.</PanelNotice> : null}
                    <FormFeedback status={status} />
                </PanelCard>
            </div>
        </div>
    );
}
