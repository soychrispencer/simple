'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { IconArrowRight, IconBuildingStore, IconCopy, IconUserPlus, IconUsers } from '@tabler/icons-react';
import {
    acceptAccountInvitation,
    createAccountInvitation,
    fetchAccountInvitationPreview,
    fetchCurrentAccountMembers,
    removeAccountMember,
    revokeAccountInvitation,
    switchCurrentAccount,
    transferAccountOwnership,
    updateAccountMemberRole,
    type AccountTeamVertical,
    type AccountMembership,
    type AccountInvitation,
    type SimpleAccount,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelField, PanelPageHeader } from './panel-display.js';

type InviteState = {
    inviteUrl: string;
    email: string;
    expiresAt?: string;
} | null;

function roleLabel(role: string): string {
    if (role === 'owner') return 'Dueño del espacio';
    if (role === 'admin') return 'Administrador';
    return 'Agente';
}

function formatExpiry(value?: string): string {
    if (!value) return 'Vence en 7 días';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Vence en 7 días'
        : `Vence el ${date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`;
}

export type AccountTeamManagerProps = {
    vertical: AccountTeamVertical;
    invitationToken: string;
    user: { email?: string | null } | null;
    openAuth: (mode: 'login' | 'register') => void;
    logout: () => Promise<void>;
    navigate: (href: string) => void;
    replaceRoute: (href: string) => void;
};

export function AccountTeamManager({ vertical, invitationToken, user, openAuth, logout, navigate, replaceRoute }: AccountTeamManagerProps) {
    const [account, setAccount] = useState<SimpleAccount | null>(null);
    const [members, setMembers] = useState<AccountMembership[]>([]);
    const [invitations, setInvitations] = useState<AccountInvitation[]>([]);
    const [memberCount, setMemberCount] = useState(0);
    const [invitationCount, setInvitationCount] = useState(0);
    const [membersHaveMore, setMembersHaveMore] = useState(false);
    const [invitationsHaveMore, setInvitationsHaveMore] = useState(false);
    const [loadingMoreMembers, setLoadingMoreMembers] = useState(false);
    const [loadingMoreInvitations, setLoadingMoreInvitations] = useState(false);
    const [currentMemberRole, setCurrentMemberRole] = useState<string | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [teamEnabled, setTeamEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'agent' | 'admin'>('agent');
    const [invite, setInvite] = useState<InviteState>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<{ email: string; role: string; accountName: string; expiresAt: string } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(Boolean(invitationToken));
    const [inviteHandled, setInviteHandled] = useState(false);
    const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchCurrentAccountMembers(vertical);
            if (result) {
                setAccount(result.account);
                setMembers(result.members);
                setInvitations(result.invitations);
                setMemberCount(result.memberCount);
                setInvitationCount(result.invitationCount);
                setMembersHaveMore(result.hasMoreMembers);
                setInvitationsHaveMore(result.hasMoreInvitations);
                setCurrentMemberRole(result.currentMemberRole);
                setCanManage(result.canManage);
                setTeamEnabled(result.teamEnabled);
                if (result.error) setError(result.error);
            } else {
                setError('No pudimos cargar el equipo. Inténtalo nuevamente.');
            }
        } catch {
            setError('No pudimos cargar el equipo. Inténtalo nuevamente.');
        } finally {
            setLoading(false);
        }
    }, [vertical]);

    async function loadMoreMembers() {
        if (loadingMoreMembers || !membersHaveMore) return;
        setLoadingMoreMembers(true);
        try {
            const result = await fetchCurrentAccountMembers(vertical, { section: 'members', offset: members.length });
            if (result?.error) setError(result.error);
            else if (result) {
                setMembers((current) => {
                    const loadedIds = new Set(current.map((member) => member.userId));
                    return [...current, ...result.members.filter((member) => !loadedIds.has(member.userId))];
                });
                setMemberCount(result.memberCount);
                setMembersHaveMore(result.hasMoreMembers);
            } else setError('No pudimos cargar más integrantes. Inténtalo nuevamente.');
        } catch {
            setError('No pudimos cargar más integrantes. Inténtalo nuevamente.');
        } finally {
            setLoadingMoreMembers(false);
        }
    }

    async function loadMoreInvitations() {
        if (loadingMoreInvitations || !invitationsHaveMore) return;
        setLoadingMoreInvitations(true);
        try {
            const result = await fetchCurrentAccountMembers(vertical, { section: 'invitations', offset: invitations.length });
            if (result?.error) setError(result.error);
            else if (result) {
                setInvitations((current) => {
                    const loadedIds = new Set(current.map((invitation) => invitation.id));
                    return [...current, ...result.invitations.filter((invitation) => !loadedIds.has(invitation.id))];
                });
                setInvitationCount(result.invitationCount);
                setInvitationsHaveMore(result.hasMoreInvitations);
            } else setError('No pudimos cargar más invitaciones. Inténtalo nuevamente.');
        } catch {
            setError('No pudimos cargar más invitaciones. Inténtalo nuevamente.');
        } finally {
            setLoadingMoreInvitations(false);
        }
    }

    useEffect(() => {
        if (invitationToken || !user) {
            setLoading(false);
            return;
        }
        void load();
    }, [invitationToken, load, user?.email]);

    useEffect(() => {
        if (!invitationToken) {
            setPreview(null);
            setPreviewLoading(false);
            setInvitePreviewError(null);
            return;
        }
        let cancelled = false;
        setPreview(null);
        setPreviewLoading(true);
        setInvitePreviewError(null);
        void fetchAccountInvitationPreview(invitationToken).then((result) => {
            if (cancelled) return;
            if (result.ok) setPreview(result.invitation);
            else setInvitePreviewError(result.error);
        }).catch(() => {
            if (!cancelled) setInvitePreviewError('No pudimos revisar esta invitación. Inténtalo nuevamente.');
        }).finally(() => {
            if (!cancelled) setPreviewLoading(false);
        });
        return () => { cancelled = true; };
    }, [invitationToken]);

    async function handleInvite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setNotice(null);
        const result = await createAccountInvitation(email, inviteRole, vertical);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setInvite({ inviteUrl: result.inviteUrl, email: result.email, expiresAt: result.expiresAt });
        setEmail('');
        setNotice(result.emailSent
            ? `Invitación enviada a ${result.email}. También puedes copiar el enlace si quieres compartirlo por otro medio.`
            : `La invitación está lista, pero no pudimos enviarla por correo. Copia el enlace y compártelo con ${result.email}.`);
        await load();
    }

    async function copyInvite() {
        if (!invite) return;
        try {
            await navigator.clipboard.writeText(invite.inviteUrl);
            setNotice('Enlace copiado.');
        } catch {
            window.prompt('Copia este enlace de invitación:', invite.inviteUrl);
        }
    }

    async function handleAcceptInvitation() {
        setSaving(true);
        setError(null);
        const result = await acceptAccountInvitation(invitationToken);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setInviteHandled(true);
        setNotice(`Ya formas parte de ${result.account?.name ?? preview?.accountName ?? 'este espacio'}.`);
        if (result.account?.id) {
            const switched = await switchCurrentAccount(result.account.id);
            if (switched.ok) window.location.href = '/panel';
            else setError('La invitación se aceptó, pero no pudimos activar el espacio. Entra al panel y selecciónalo desde el selector de espacios.');
            return;
        }
        replaceRoute('/panel/equipo');
        await load();
    }

    async function handleRoleChange(member: AccountMembership, role: 'admin' | 'agent') {
        setSaving(true);
        setError(null);
        const result = await updateAccountMemberRole(member.userId, role);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNotice(`Permiso actualizado para ${member.name ?? member.email ?? 'integrante'}.`);
        setMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role } : item));
    }

    async function handleOwnershipTransfer(member: AccountMembership) {
        const name = member.name?.trim() || member.email || 'esta persona';
        if (!window.confirm(`¿Transferir la propiedad de ${account?.name ?? 'este espacio'} a ${name}? Esa persona quedará como dueña y tú seguirás como administrador. Después podrás salir del espacio si lo necesitas.`)) return;
        setSaving(true);
        setError(null);
        setNotice(null);
        const result = await transferAccountOwnership(member.userId, vertical);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNotice(`La propiedad del espacio ahora pertenece a ${name}. Tú quedaste como administrador.`);
        setCurrentMemberRole('admin');
        setMembers((current) => current.map((item) => item.userId === member.userId
            ? { ...item, role: 'owner' }
            : item.isCurrentUser
                ? { ...item, role: 'admin' }
                : item));
    }

    async function handleRemove(member: AccountMembership) {
        const name = member.name?.trim() || member.email || 'esta persona';
        const isSelfLeaving = Boolean(member.isCurrentUser);
        const confirmation = isSelfLeaving
            ? `¿Quieres salir de ${account?.name ?? 'este espacio'}? Tu acceso se quitará. Las publicaciones, contactos, seguimientos y visitas seguirán en el espacio; lo que estaba asignado a ti quedará disponible para que el equipo lo reasigne. Tu cuenta personal se mantiene.`
            : `¿Quitar a ${name} de este equipo?`;
        if (!window.confirm(confirmation)) return;
        setSaving(true);
        setError(null);
        const result = await removeAccountMember(member.userId);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        if (isSelfLeaving) {
            window.location.href = '/panel';
            return;
        }
        setNotice(`${name} ya no forma parte de este espacio.`);
        setMembers((current) => current.filter((item) => item.userId !== member.userId));
        setMemberCount((current) => Math.max(0, current - 1));
    }

    async function handleRevokeInvitation(invitation: AccountInvitation) {
        setSaving(true);
        setError(null);
        const result = await revokeAccountInvitation(invitation.id);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNotice(`Invitación para ${invitation.email} revocada.`);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
        setInvitationCount((current) => Math.max(0, current - 1));
    }

    const signedInMatchesInvite = preview && user?.email?.trim().toLowerCase() === preview.email.toLowerCase();
    const isOwner = currentMemberRole === 'owner';

    if (!user && !invitationToken) {
        return (
            <div className="container-app panel-page py-8 lg:py-12">
                <div className="mx-auto grid max-w-2xl gap-4">
                    <PanelPageHeader title="Equipo" description="Inicia sesión para administrar un espacio de trabajo." />
                    <PanelCard size="md" className="space-y-3">
                        <PanelNotice tone="neutral">Las invitaciones incluyen un enlace directo para revisar y aceptar tu acceso.</PanelNotice>
                        <PanelButton type="button" variant="primary" onClick={() => openAuth('login')}>
                            Iniciar sesión <IconArrowRight size={16} />
                        </PanelButton>
                    </PanelCard>
                </div>
            </div>
        );
    }

    if (invitationToken) {
        return (
            <div className="container-app panel-page py-8 lg:py-12">
                <div className="mx-auto grid max-w-2xl gap-4">
                    <PanelPageHeader
                        title="Unirte a un equipo"
                        description="Revisa la invitación y entra con el correo al que fue enviada."
                    />
                    <PanelCard size="md" className="space-y-4">
                        <PanelBlockHeader title="Invitación al equipo" />
                        {previewLoading ? <PanelNotice tone="neutral">Revisando invitación…</PanelNotice> : null}
                        {invitePreviewError ? <PanelNotice tone="error">{invitePreviewError}</PanelNotice> : null}
                        {preview ? (
                            <>
                                <div className="flex items-start gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--accent)' }}>
                                        <IconBuildingStore size={19} />
                                    </span>
                                    <div>
                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>{preview.accountName}</p>
                                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            Invitación para {preview.email} como {roleLabel(preview.role).toLowerCase()}.
                                        </p>
                                        <p className="mt-1 text-xs" style={{ color: 'var(--fg-faint)' }}>{formatExpiry(preview.expiresAt)}</p>
                                    </div>
                                </div>
                                {!user ? (
                                    <div className="space-y-3">
                                        <PanelNotice tone="info">
                                            Crea tu cuenta o inicia sesión con <strong>{preview.email}</strong> para unirte a este equipo.
                                        </PanelNotice>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <PanelButton type="button" variant="primary" onClick={() => openAuth('register')}>
                                                Crear cuenta y unirme <IconArrowRight size={16} />
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => openAuth('login')}>
                                                Ya tengo cuenta
                                            </PanelButton>
                                        </div>
                                    </div>
                                ) : null}
                                {user && !signedInMatchesInvite ? (
                                    <div className="space-y-3">
                                        <PanelNotice tone="error">Iniciaste sesión como {user.email}. Para aceptar, usa {preview.email}.</PanelNotice>
                                        <PanelButton
                                            type="button"
                                            variant="secondary"
                                            onClick={() => { void logout().then(() => openAuth('login')); }}
                                        >
                                            Cambiar de cuenta
                                        </PanelButton>
                                    </div>
                                ) : null}
                            </>
                        ) : null}
                        {inviteHandled ? <PanelNotice tone="success">Invitación aceptada.</PanelNotice> : null}
                        {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
                        {!inviteHandled && user && signedInMatchesInvite ? (
                            <PanelButton type="button" variant="primary" onClick={() => void handleAcceptInvitation()} loading={saving}>
                                Aceptar invitación <IconArrowRight size={16} />
                            </PanelButton>
                        ) : null}
                        {inviteHandled ? (
                            <PanelButton type="button" variant="secondary" onClick={() => navigate('/panel')}>
                                Ir a mi panel
                            </PanelButton>
                        ) : null}
                        {!previewLoading && !preview && !invitePreviewError ? (
                            <PanelNotice tone="error">No pudimos encontrar esta invitación.</PanelNotice>
                        ) : null}
                    </PanelCard>
                </div>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Equipo"
                description="Organiza quién trabaja contigo y qué puede hacer dentro de este espacio."
            />

            {teamEnabled ? (
                <PanelNotice tone="info">
                    Este espacio puede sumar integrantes sin tope por ahora. Los permisos de cada persona dependen de su rol.
                </PanelNotice>
            ) : null}

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {notice ? <PanelNotice tone="success">{notice}</PanelNotice> : null}

            {invite ? (
                <PanelCard size="md" className="mb-4 space-y-3">
                    <PanelBlockHeader title="Enlace de invitación" />
                    <p className="text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                        Comparte el enlace con <strong style={{ color: 'var(--fg)' }}>{invite.email}</strong>. {formatExpiry(invite.expiresAt)}.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            readOnly
                            value={invite.inviteUrl}
                            aria-label="Enlace para unirse al equipo"
                            className="h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                        />
                        <PanelButton type="button" variant="secondary" onClick={() => void copyInvite()}>
                            <IconCopy size={16} /> Copiar enlace
                        </PanelButton>
                    </div>
                </PanelCard>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <PanelCard size="lg" className="space-y-4">
                    <PanelBlockHeader
                        title="Personas del equipo"
                        description={account?.name ?? 'Espacio de trabajo'}
                        actions={<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}><IconUsers size={14} /> {memberCount.toLocaleString('es-CL')}</span>}
                    />
                    {loading ? <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando equipo…</p> : members.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay integrantes en este espacio.</PanelNotice>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {members.map((member) => (
                                <div key={member.userId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                            {member.name || member.email || 'Integrante'} {member.isCurrentUser ? <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>· Tú</span> : null}
                                        </p>
                                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-muted)' }}>{member.email}</p>
                                    </div>
                                    {member.isCurrentUser && member.role !== 'owner' ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{roleLabel(member.role)}</span>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void handleRemove(member)}
                                                className="rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                Salir del espacio
                                            </button>
                                        </div>
                                    ) : member.role === 'owner' || !canManage || member.isCurrentUser ? (
                                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{roleLabel(member.role)}</span>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                aria-label={`Permiso de ${member.name ?? member.email}`}
                                                value={member.role === 'admin' ? 'admin' : 'agent'}
                                                disabled={saving}
                                                onChange={(event) => void handleRoleChange(member, event.target.value as 'admin' | 'agent')}
                                                className="h-9 rounded-lg border bg-transparent px-2 text-xs"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                            >
                                                <option value="agent">Agente</option>
                                                {isOwner ? <option value="admin">Administrador</option> : null}
                                            </select>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void handleRemove(member)}
                                                className="rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                Quitar
                                            </button>
                                            {isOwner && member.role === 'admin' ? (
                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => void handleOwnershipTransfer(member)}
                                                    className="rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                                                    style={{ color: 'var(--fg-muted)' }}
                                                >
                                                    Transferir propiedad
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {membersHaveMore ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                Mostrando {members.length.toLocaleString('es-CL')} de {memberCount.toLocaleString('es-CL')} personas.
                            </p>
                            <PanelButton type="button" size="sm" variant="secondary" loading={loadingMoreMembers} onClick={() => void loadMoreMembers()}>
                                Mostrar más personas
                            </PanelButton>
                        </div>
                    ) : null}
                    {canManage && invitationCount > 0 ? (
                        <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Invitaciones pendientes</h3>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{invitationCount.toLocaleString('es-CL')}</span>
                            </div>
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className="flex flex-col gap-2 rounded-xl px-3 py-3 sm:flex-row sm:items-center" style={{ background: 'var(--bg-subtle)' }}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{invitation.email}</p>
                                        <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {roleLabel(invitation.role)} · {formatExpiry(invitation.expiresAt)}
                                        </p>
                                    </div>
                                    {(isOwner || invitation.role !== 'admin') ? (
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => void handleRevokeInvitation(invitation)}
                                            className="self-start rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)] sm:self-auto"
                                            style={{ color: 'var(--fg-muted)' }}
                                        >
                                            Revocar
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                            {invitationsHaveMore ? (
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Mostrando {invitations.length.toLocaleString('es-CL')} de {invitationCount.toLocaleString('es-CL')} invitaciones.
                                    </p>
                                    <PanelButton type="button" size="sm" variant="secondary" loading={loadingMoreInvitations} onClick={() => void loadMoreInvitations()}>
                                        Mostrar más invitaciones
                                    </PanelButton>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </PanelCard>

                <PanelCard size="md" className="h-fit space-y-4">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--accent)' }}>
                            <IconUserPlus size={19} />
                        </span>
                        <div>
                            <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Invita a alguien</h2>
                            <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>La persona aceptará con su propio correo de Simple.</p>
                        </div>
                    </div>
                    {!teamEnabled ? (
                        <div className="space-y-3">
                            <PanelNotice tone="neutral">Para invitar a tu equipo, primero configura este espacio como empresa desde Mi panel.</PanelNotice>
                            <PanelButton type="button" variant="secondary" onClick={() => navigate('/panel')}>
                                Configurar mi espacio <IconArrowRight size={16} />
                            </PanelButton>
                        </div>
                    ) : !canManage ? (
                        <PanelNotice tone="neutral">Solo quien administra este espacio puede invitar personas.</PanelNotice>
                    ) : (
                        <form className="space-y-4" onSubmit={(event) => void handleInvite(event)}>
                            <PanelField label="Correo de la persona" required>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    maxLength={255}
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="nombre@empresa.cl"
                                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                />
                            </PanelField>
                            <PanelField label="Permiso en el equipo">
                                <select
                                    value={inviteRole}
                                    onChange={(event) => setInviteRole(event.target.value as 'agent' | 'admin')}
                                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                >
                                    <option value="agent">Agente · gestiona publicaciones y contactos asignados</option>
                                    {isOwner ? <option value="admin">Administrador · también gestiona el equipo</option> : null}
                                </select>
                            </PanelField>
                            <PanelButton type="submit" variant="primary" loading={saving} disabled={!email.trim()}>
                                Crear invitación <IconArrowRight size={16} />
                            </PanelButton>
                        </form>
                    )}
                    <p className="border-t pt-3 text-xs leading-5" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                        Cada persona conserva su cuenta y puede cambiar entre su espacio personal y los equipos donde trabaja.
                    </p>
                </PanelCard>
            </div>
        </div>
    );
}
