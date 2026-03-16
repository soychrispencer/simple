'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    IconArrowDown,
    IconArrowUp,
    IconBadgeTm,
    IconBuildingStore,
    IconMail,
    IconPhone,
    IconTrash,
    IconUser,
    IconUsersGroup,
} from '@tabler/icons-react';
import { PanelBlockHeader, PanelButton, PanelCard, PanelChoiceCard, PanelNotice, PanelStatusBadge } from '@simple/ui';
import {
    fetchAccountPublicProfile,
    type EditablePublicProfile,
    type EditablePublicProfileTeamMember,
    type PublicProfileLeadRoutingMode,
    updateAccountPublicProfile,
} from '@/lib/public-profile-settings';

const ROUTING_OPTIONS: Array<{
    value: PublicProfileLeadRoutingMode;
    label: string;
    description: string;
    icon: ReactNode;
}> = [
    {
        value: 'owner',
        label: 'Cuenta principal',
        description: 'Todos los leads nuevos quedan asignados a la cuenta titular.',
        icon: <IconUser size={18} />,
    },
    {
        value: 'round_robin',
        label: 'Round robin del equipo',
        description: 'Se reparten entre los integrantes habilitados para recibir leads.',
        icon: <IconUsersGroup size={18} />,
    },
    {
        value: 'unassigned',
        label: 'Sin asignar',
        description: 'Los leads entran a bandeja sin responsable para revisión manual.',
        icon: <IconBuildingStore size={18} />,
    },
];

function createClientUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const tail = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
    return `00000000-0000-4000-8000-${tail}`;
}

function createEmptyTeamMember(): EditablePublicProfileTeamMember {
    return {
        id: null,
        name: '',
        roleTitle: null,
        bio: null,
        email: null,
        phone: null,
        whatsapp: null,
        avatarImageUrl: null,
        socialLinks: {
            instagram: null,
            facebook: null,
            linkedin: null,
        },
        specialties: [],
        isLeadContact: false,
        receivesLeads: true,
        isPublished: false,
    };
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                {icon}
                {label}
            </label>
            {children}
        </div>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span style={{ color: 'var(--fg-secondary)' }}>{label}</span>
            <span className="text-right font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
        </div>
    );
}

function routingLabel(mode: PublicProfileLeadRoutingMode) {
    return ROUTING_OPTIONS.find((option) => option.value === mode)?.label ?? 'Round robin del equipo';
}

export default function CrmTeamSettingsManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [currentPlanId, setCurrentPlanId] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('free');
    const [form, setForm] = useState<EditablePublicProfile | null>(null);
    const [teamDraft, setTeamDraft] = useState<EditablePublicProfileTeamMember>(createEmptyTeamMember);
    const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void (async () => {
            const response = await fetchAccountPublicProfile();
            if (!active) return;
            if (response?.ok) {
                setFeatureEnabled(response.featureEnabled);
                setCurrentPlanName(response.currentPlanName);
                setCurrentPlanId(response.currentPlanId);
                setForm(response.profile);
            }
            setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, []);

    const leadReceiversCount = useMemo(
        () => form?.teamMembers.filter((member) => member.receivesLeads).length ?? 0,
        [form?.teamMembers]
    );
    const publicMembersCount = useMemo(
        () => form?.teamMembers.filter((member) => member.isPublished).length ?? 0,
        [form?.teamMembers]
    );

    const updateForm = <K extends keyof EditablePublicProfile>(key: K, value: EditablePublicProfile[K]) => {
        setForm((current) => (current ? { ...current, [key]: value } : current));
    };

    const resetTeamDraft = () => {
        setTeamDraft(createEmptyTeamMember());
        setEditingTeamMemberId(null);
    };

    const saveTeamDraft = () => {
        const normalizedName = teamDraft.name.trim();
        if (!normalizedName) {
            setNotice('Ingresa el nombre del integrante antes de guardarlo.');
            return;
        }

        setForm((current) => {
            if (!current) return current;
            const previousMember = editingTeamMemberId
                ? current.teamMembers.find((item) => item.id === editingTeamMemberId) ?? createEmptyTeamMember()
                : createEmptyTeamMember();
            const normalizedMember: EditablePublicProfileTeamMember = {
                ...previousMember,
                ...teamDraft,
                id: teamDraft.id ?? previousMember.id ?? createClientUuid(),
                name: normalizedName,
                roleTitle: teamDraft.roleTitle?.trim() || null,
                email: teamDraft.email?.trim() || null,
                phone: teamDraft.phone?.trim() || null,
                whatsapp: teamDraft.whatsapp?.trim() || null,
                receivesLeads: teamDraft.receivesLeads,
            };
            const nextTeam = editingTeamMemberId
                ? current.teamMembers.map((item) => (item.id === editingTeamMemberId ? normalizedMember : item))
                : [...current.teamMembers, normalizedMember];
            return {
                ...current,
                teamMembers: nextTeam,
            };
        });

        setNotice(editingTeamMemberId ? 'Integrante actualizado. Guarda el módulo para aplicar el cambio.' : 'Integrante agregado. Guarda el módulo para aplicar el cambio.');
        resetTeamDraft();
    };

    const editTeamMember = (member: EditablePublicProfileTeamMember) => {
        setTeamDraft(member);
        setEditingTeamMemberId(member.id);
        setNotice(null);
    };

    const removeTeamMember = (memberId: string | null) => {
        if (!memberId) return;
        setForm((current) => current ? {
            ...current,
            teamMembers: current.teamMembers.filter((item) => item.id !== memberId),
        } : current);
        if (editingTeamMemberId === memberId) {
            resetTeamDraft();
        }
        setNotice('Integrante eliminado del equipo. Guarda el módulo para confirmar el cambio.');
    };

    const moveTeamMember = (memberId: string | null, direction: -1 | 1) => {
        if (!memberId) return;
        setForm((current) => {
            if (!current) return current;
            const index = current.teamMembers.findIndex((item) => item.id === memberId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.teamMembers.length) return current;
            const nextTeam = [...current.teamMembers];
            const [item] = nextTeam.splice(index, 1);
            nextTeam.splice(nextIndex, 0, item);
            return {
                ...current,
                teamMembers: nextTeam,
            };
        });
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setNotice(null);
        const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...payload } = form;
        const response = await updateAccountPublicProfile(payload);
        setSaving(false);
        if (!response.ok) {
            setNotice(response.error ?? 'No pudimos guardar la configuración del equipo.');
            return;
        }
        setFeatureEnabled(response.featureEnabled);
        setCurrentPlanId(response.currentPlanId);
        setCurrentPlanName(response.currentPlanName);
        setForm(response.profile);
        setNotice('Equipo y routing guardados.');
    };

    if (loading) {
        return <PanelCard size="lg" className="min-h-[240px] animate-pulse"><div /></PanelCard>;
    }

    if (!form) {
        return <PanelNotice tone="warning">No pudimos cargar la configuración del equipo.</PanelNotice>;
    }

    if (!featureEnabled && currentPlanId === 'free') {
        return (
            <PanelCard size="lg" className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                    <PanelStatusBadge label={`Plan actual: ${currentPlanName}`} tone="warning" />
                    <PanelStatusBadge label="Función premium" tone="neutral" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Equipo y routing está disponible para cuentas pagadas.</h3>
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        Activa una suscripción para repartir leads, organizar asesores y operar el CRM con equipo comercial.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href="/panel/suscripciones" className="btn-primary">Ver suscripciones</Link>
                    <Link href="/panel/configuracion" className="btn-secondary">Volver a configuración</Link>
                </div>
            </PanelCard>
        );
    }

    return (
        <div className="space-y-6">
            <PanelCard size="lg" className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <PanelStatusBadge label={`Plan ${currentPlanName}`} tone="info" />
                            <PanelStatusBadge label={routingLabel(form.leadRoutingMode)} tone="neutral" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Equipo comercial y routing</h3>
                            <p className="text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>
                                Aquí defines quién recibe leads y cómo se reparten. La presencia pública del equipo se gestiona aparte desde la ficha pública.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link href="/panel/configuracion" className="btn-secondary">
                            Editar página pública
                        </Link>
                    </div>
                </div>

                {notice ? <PanelNotice tone="neutral">{notice}</PanelNotice> : null}

                <PanelNotice tone="neutral">
                    Usa este módulo para routing y operación comercial. Si quieres mostrar integrantes, bio, redes o avatar en tu ficha pública, edítalos desde <strong>Configuración &gt; Página pública</strong>.
                </PanelNotice>
            </PanelCard>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title="Routing automático"
                        description="Define qué pasa con cada lead nuevo que entra a tus publicaciones."
                        className="mb-0"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                        {ROUTING_OPTIONS.map((option) => (
                            <PanelChoiceCard
                                key={option.value}
                                selected={form.leadRoutingMode === option.value}
                                onClick={() => updateForm('leadRoutingMode', option.value)}
                                className="text-left"
                            >
                                <div className="space-y-2">
                                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                        {option.icon}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</p>
                                        <p className="text-xs leading-5" style={{ color: 'var(--fg-secondary)' }}>{option.description}</p>
                                    </div>
                                </div>
                            </PanelChoiceCard>
                        ))}
                    </div>

                    {form.leadRoutingMode === 'round_robin' && leadReceiversCount === 0 ? (
                        <PanelNotice tone="warning">
                            No hay integrantes habilitados para recibir leads. Si guardas así, los leads caerán en la cuenta principal como respaldo.
                        </PanelNotice>
                    ) : null}
                </PanelCard>

                <PanelCard size="lg" className="space-y-4">
                    <PanelBlockHeader
                        title="Resumen operativo"
                        description="Lectura rápida del estado actual del equipo."
                        className="mb-0"
                    />
                    <SummaryItem label="Cuenta" value={form.displayName} />
                    <SummaryItem label="Routing" value={routingLabel(form.leadRoutingMode)} />
                    <SummaryItem label="Equipo" value={`${form.teamMembers.length} integrante${form.teamMembers.length === 1 ? '' : 's'}`} />
                    <SummaryItem label="Reciben leads" value={`${leadReceiversCount}`} />
                    <SummaryItem label="Visibles en ficha" value={`${publicMembersCount}`} />
                </PanelCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title="Integrantes del equipo"
                        description="Gestiona los responsables disponibles para recibir y administrar leads."
                        className="mb-0"
                    />

                    <div className="space-y-3">
                        {form.teamMembers.length === 0 ? (
                            <PanelNotice tone="neutral">
                                Aún no agregas integrantes. Puedes trabajar solo con la cuenta principal o crear asesores internos para routing y asignación manual.
                            </PanelNotice>
                        ) : (
                            form.teamMembers.map((member, index) => (
                                <div key={member.id ?? `${member.name}-${index}`} className="rounded-[22px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{member.name}</p>
                                                <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{member.roleTitle || 'Asesor comercial'}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <PanelStatusBadge label={member.receivesLeads ? 'Recibe leads' : 'Pausado'} tone={member.receivesLeads ? 'success' : 'neutral'} size="sm" />
                                                <PanelStatusBadge label={member.isPublished ? 'Visible en ficha' : 'Solo interno'} tone="neutral" size="sm" />
                                                {member.isLeadContact ? <PanelStatusBadge label="Contacto destacado" tone="info" size="sm" /> : null}
                                            </div>

                                            <div className="space-y-1 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                                {member.email ? (
                                                    <div className="inline-flex items-center gap-2">
                                                        <IconMail size={14} />
                                                        {member.email}
                                                    </div>
                                                ) : null}
                                                {member.phone ? (
                                                    <div className="inline-flex items-center gap-2">
                                                        <IconPhone size={14} />
                                                        {member.phone}
                                                    </div>
                                                ) : null}
                                                {member.whatsapp ? (
                                                    <div className="inline-flex items-center gap-2">
                                                        <IconPhone size={14} />
                                                        WhatsApp: {member.whatsapp}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <PanelButton type="button" variant="secondary" onClick={() => moveTeamMember(member.id, -1)} disabled={index === 0}>
                                                <IconArrowUp size={14} />
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => moveTeamMember(member.id, 1)} disabled={index === form.teamMembers.length - 1}>
                                                <IconArrowDown size={14} />
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => editTeamMember(member)}>
                                                Editar
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => removeTeamMember(member.id)}>
                                                <IconTrash size={14} />
                                            </PanelButton>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </PanelCard>

                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title={editingTeamMemberId ? 'Editar integrante' : 'Nuevo integrante'}
                        description="Información operativa para lead routing y asignación manual."
                        className="mb-0"
                    />

                    <div className="grid gap-4">
                        <Field label="Nombre" icon={<IconUser size={14} />}>
                            <input className="form-input" value={teamDraft.name} onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Carolina Muñoz" />
                        </Field>
                        <Field label="Cargo o rol" icon={<IconBadgeTm size={14} />}>
                            <input className="form-input" value={teamDraft.roleTitle ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, roleTitle: event.target.value }))} placeholder="Ej: Asesora de arriendos" />
                        </Field>
                        <Field label="Correo" icon={<IconMail size={14} />}>
                            <input className="form-input" value={teamDraft.email ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, email: event.target.value }))} placeholder="asesor@tuempresa.cl" />
                        </Field>
                        <Field label="Teléfono" icon={<IconPhone size={14} />}>
                            <input className="form-input" value={teamDraft.phone ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+56 9 1234 5678" />
                        </Field>
                        <Field label="WhatsApp" icon={<IconPhone size={14} />}>
                            <input className="form-input" value={teamDraft.whatsapp ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="+56 9 1234 5678" />
                        </Field>

                        <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            <input type="checkbox" checked={teamDraft.receivesLeads} onChange={(event) => setTeamDraft((current) => ({ ...current, receivesLeads: event.target.checked }))} />
                            Recibe leads automáticos
                        </label>

                        <PanelNotice tone="neutral">
                            La bio, avatar, redes, especialidades y visibilidad pública del integrante se gestionan en <strong>Página pública</strong>.
                        </PanelNotice>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <PanelButton type="button" onClick={saveTeamDraft}>
                            {editingTeamMemberId ? 'Actualizar integrante' : 'Agregar integrante'}
                        </PanelButton>
                        {editingTeamMemberId ? (
                            <PanelButton type="button" variant="secondary" onClick={resetTeamDraft}>
                                Cancelar edición
                            </PanelButton>
                        ) : null}
                    </div>
                </PanelCard>
            </div>

            <div className="flex flex-wrap gap-3">
                <PanelButton type="button" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar equipo y routing'}
                </PanelButton>
                <Link href="/panel/configuracion" className="btn-secondary">
                    Ir a página pública
                </Link>
            </div>
        </div>
    );
}
