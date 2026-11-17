import { apiFetch } from './api-client.js';

export type SimpleAccount = {
    id: string;
    name: string;
    type: string;
    isPersonal: boolean;
};

export type AccountMembership = {
    id: string;
    accountId: string;
    userId: string;
    role: 'owner' | 'admin' | 'agent' | string;
    isDefault: boolean;
    account?: SimpleAccount | null;
    name?: string;
    email?: string;
    isCurrentUser?: boolean;
};

export type AccountInvitation = {
    id: string;
    email: string;
    role: 'admin' | 'agent' | string;
    createdAt: string;
    expiresAt: string;
};

export type AccountTeamVertical = 'autos' | 'propiedades';
export type AccountTeamListSection = 'all' | 'members' | 'invitations';
export type AccountTeamListOptions = {
    section?: AccountTeamListSection;
    offset?: number;
    membersOffset?: number;
    invitationsOffset?: number;
};

type AccountResponse<T> = { ok: boolean; error?: string } & T;

export async function fetchCurrentAccountContext(): Promise<{
    account: SimpleAccount | null;
    memberships: AccountMembership[];
} | null> {
    const { data } = await apiFetch<AccountResponse<{
        account?: SimpleAccount;
        memberships?: AccountMembership[];
    }>>('/api/accounts/current', { method: 'GET' });
    if (!data?.ok || !data.account) return null;
    return { account: data.account, memberships: data.memberships ?? [] };
}

export async function switchCurrentAccount(accountId: string): Promise<{ ok: boolean; error?: string }> {
    const { data } = await apiFetch<AccountResponse<unknown>>('/api/accounts/current/switch', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
    });
    return data?.ok ? { ok: true } : { ok: false, error: data?.error ?? 'No pudimos cambiar de espacio.' };
}

export async function createBusinessWorkspace(name: string): Promise<{ ok: true; account: SimpleAccount } | { ok: false; error: string }> {
    const { data } = await apiFetch<AccountResponse<{ account?: SimpleAccount }>>('/api/accounts/current/business-spaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
    if (!data?.ok || !data.account) {
        return { ok: false, error: data?.error ?? 'No pudimos crear el espacio.' };
    }
    return { ok: true, account: data.account };
}

export async function fetchCurrentAccountMembers(
    vertical: AccountTeamVertical = 'propiedades',
    options: AccountTeamListOptions = {},
): Promise<{
    account: SimpleAccount | null;
    members: AccountMembership[];
    invitations: AccountInvitation[];
    memberCount: number;
    invitationCount: number;
    hasMoreMembers: boolean;
    hasMoreInvitations: boolean;
    currentMemberRole: string | null;
    canManage: boolean;
    teamEnabled: boolean;
    error?: string;
} | null> {
    const params = new URLSearchParams({ vertical });
    if (options.section && options.section !== 'all') params.set('section', options.section);
    if (options.offset !== undefined) params.set('offset', String(options.offset));
    if (options.membersOffset !== undefined) params.set('membersOffset', String(options.membersOffset));
    if (options.invitationsOffset !== undefined) params.set('invitationsOffset', String(options.invitationsOffset));
    const { data } = await apiFetch<AccountResponse<{
        account?: SimpleAccount;
        members?: AccountMembership[];
        invitations?: AccountInvitation[];
        memberCount?: number;
        invitationCount?: number;
        hasMoreMembers?: boolean;
        hasMoreInvitations?: boolean;
        currentMemberRole?: string;
        canManage?: boolean;
        teamEnabled?: boolean;
    }>>(`/api/accounts/current/members?${params.toString()}`, { method: 'GET' });
    if (!data?.ok) {
        return {
            account: null,
            members: [],
            invitations: [],
            memberCount: 0,
            invitationCount: 0,
            hasMoreMembers: false,
            hasMoreInvitations: false,
            currentMemberRole: null,
            canManage: false,
            teamEnabled: false,
            error: data?.error,
        };
    }
    return {
        account: data.account ?? null,
        members: data.members ?? [],
        invitations: data.invitations ?? [],
        memberCount: Number(data.memberCount ?? 0),
        invitationCount: Number(data.invitationCount ?? 0),
        hasMoreMembers: data.hasMoreMembers === true,
        hasMoreInvitations: data.hasMoreInvitations === true,
        currentMemberRole: typeof data.currentMemberRole === 'string' ? data.currentMemberRole : null,
        canManage: Boolean(data.canManage),
        teamEnabled: Boolean(data.teamEnabled),
    };
}

export async function createAccountInvitation(
    email: string,
    role: 'admin' | 'agent' = 'agent',
    vertical: AccountTeamVertical = 'propiedades',
) {
    const { data } = await apiFetch<AccountResponse<{
        inviteUrl?: string;
        email?: string;
        emailSent?: boolean;
        role?: 'admin' | 'agent';
        expiresAt?: string;
    }>>(`/api/accounts/current/invitations?vertical=${vertical}`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
    });
    if (!data?.ok || !data.inviteUrl) {
        return { ok: false as const, error: data?.error ?? 'No pudimos crear la invitación.' };
    }
    return {
        ok: true as const,
        inviteUrl: data.inviteUrl,
        email: data.email ?? email,
        emailSent: data.emailSent === true,
        role: data.role ?? role,
        expiresAt: data.expiresAt,
    };
}

export async function revokeAccountInvitation(invitationId: string) {
    const { data } = await apiFetch<AccountResponse<unknown>>(`/api/accounts/current/invitations/${encodeURIComponent(invitationId)}`, {
        method: 'DELETE',
    });
    return data?.ok ? { ok: true as const } : { ok: false as const, error: data?.error ?? 'No pudimos revocar la invitación.' };
}

export async function fetchAccountInvitationPreview(token: string) {
    const params = new URLSearchParams({ token });
    const { data } = await apiFetch<AccountResponse<{
        invitation?: { email: string; role: string; expiresAt: string; accountName: string };
    }>>(`/api/accounts/invitations/preview?${params.toString()}`, { method: 'GET' });
    if (!data?.ok || !data.invitation) return { ok: false as const, error: data?.error ?? 'La invitación no está vigente.' };
    return { ok: true as const, invitation: data.invitation };
}

export async function acceptAccountInvitation(token: string) {
    const { data } = await apiFetch<AccountResponse<{ account?: SimpleAccount }>>('/api/accounts/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
    return data?.ok
        ? { ok: true as const, account: data.account ?? null }
        : { ok: false as const, error: data?.error ?? 'No pudimos aceptar la invitación.' };
}

export async function updateAccountMemberRole(userId: string, role: 'admin' | 'agent') {
    const { data } = await apiFetch<AccountResponse<unknown>>(`/api/accounts/current/members/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
    return data?.ok ? { ok: true as const } : { ok: false as const, error: data?.error ?? 'No pudimos actualizar los permisos.' };
}

export async function transferAccountOwnership(
    userId: string,
    vertical: AccountTeamVertical = 'propiedades',
) {
    const { data } = await apiFetch<AccountResponse<unknown>>(`/api/accounts/current/ownership-transfer?vertical=${vertical}`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
    return data?.ok ? { ok: true as const } : { ok: false as const, error: data?.error ?? 'No pudimos transferir la propiedad.' };
}

export async function removeAccountMember(userId: string) {
    const { data } = await apiFetch<AccountResponse<unknown>>(`/api/accounts/current/members/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
    });
    return data?.ok ? { ok: true as const } : { ok: false as const, error: data?.error ?? 'No pudimos quitar a esta persona.' };
}
