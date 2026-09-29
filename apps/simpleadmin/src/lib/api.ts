import { API_BASE } from '@simple/config';

export type AdminSessionUser = {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'superadmin';
    status?: 'active' | 'verified' | 'suspended';
    primaryVertical?: 'autos' | 'propiedades' | 'agenda' | null;
    avatar?: string | null;
};

export type AdminVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type AdminUserRole = 'user' | 'admin' | 'superadmin';
export type AdminUserStatus = 'active' | 'verified' | 'suspended';

export type AdminVerticalSignal = {
    vertical: AdminVertical;
    source: string;
    label: string;
    count: number;
    firstSeenAt: number | null;
    lastSeenAt: number | null;
};

export type AdminPlatformAccess = {
    app: 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas';
    label: string;
    vertical: AdminVertical;
    role: string;
    status: string;
    origin: string | null;
    firstSeenAt: number | null;
    activatedAt: number | null;
    lastLoginAt: number | null;
};

export type AdminSubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'free';

export type AdminUserSubscriptions = {
    agenda?: { plan: 'free' | 'pro'; status: AdminSubscriptionStatus; expiresAt: string | null };
    autos?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    propiedades?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    serenatas?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
};

export type AdminUserSnapshot = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    rut?: string | null;
    role: AdminUserRole;
    status: AdminUserStatus;
    primaryVertical: 'autos' | 'propiedades' | 'agenda' | null;
    provider: string | null;
    signupApp: string | null;
    signupOrigin: string | null;
    signupSourceLabel: string;
    createdAt: number;
    lastLoginAt: number | null;
    totalListings: number;
    agendaListings: number;
    autosListings: number;
    propiedadesListings: number;
    likelySignupVertical: AdminVertical | null;
    verticalConfidence: 'direct' | 'inferred' | 'unknown';
    verticalSignals: AdminVerticalSignal[];
    platformAccesses: AdminPlatformAccess[];
    primaryPlatform: AdminPlatformAccess | null;
    realness: {
        label: string;
        score: number;
        reasons: string[];
    };
    subscriptions?: AdminUserSubscriptions;
    serenatas?: {
        client: boolean;
        musician: boolean;
        owner: boolean;
        instrument: string | null;
        ownerStatus: string | null;
        trialEndsAt: string | null;
    };
};

type ApiEnvelope<T> = { ok?: boolean; error?: string } & T;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ response: Response; data: ApiEnvelope<T> | null }> {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    const data = (await response.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
    return { response, data };
}

async function expectOk<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
    const { response, data } = await apiRequest<T>(path, init);
    if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || 'No se pudo completar la operación');
    }
    if (!data) throw new Error('Respuesta vacía del servidor');
    return data;
}

export type AdminUsersSummary = {
    total: number;
    withPlatform: number;
    withActiveSubscription: number;
    suspended: number;
};

export type AdminUsersPage = {
    items: AdminUserSnapshot[];
    summary: AdminUsersSummary;
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
};

export async function fetchAdminUsers(input: {
    query?: string;
    status?: 'all' | AdminUserStatus;
    vertical?: 'all' | AdminVertical;
    page?: number;
    pageSize?: number;
} = {}): Promise<AdminUsersPage> {
    const params = new URLSearchParams();
    if (input.query?.trim()) params.set('q', input.query.trim());
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.vertical && input.vertical !== 'all') params.set('vertical', input.vertical);
    params.set('page', String(input.page ?? 1));
    params.set('pageSize', String(input.pageSize ?? 25));
    const data = await expectOk<Partial<AdminUsersPage>>(`/api/admin/users?${params.toString()}`);
    const items = (data.items ?? []).map((user) => ({
        ...user,
        platformAccesses: user.platformAccesses ?? [],
        primaryPlatform: user.primaryPlatform ?? null,
    }));
    return {
        items,
        summary: data.summary ?? { total: items.length, withPlatform: 0, withActiveSubscription: 0, suspended: 0 },
        page: data.page ?? 1,
        pageSize: data.pageSize ?? 25,
        total: data.total ?? items.length,
        pageCount: data.pageCount ?? 1,
    };
}

export async function updateAdminUser(userId: string, input: {
    name?: string;
    phone?: string | null;
    rut?: string | null;
    primaryVertical?: 'autos' | 'propiedades' | 'agenda' | null;
    role?: AdminUserRole;
    status?: AdminUserStatus;
}): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export async function updateAdminUserSubscriptions(userId: string, subscriptions: Record<string, unknown>): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/subscriptions`, {
        method: 'PATCH',
        body: JSON.stringify({ subscriptions }),
    });
}

export async function updateAdminUserRole(userId: string, role: AdminUserRole): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
}

export async function updateAdminUserStatus(userId: string, status: AdminUserStatus): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

export async function deleteAdminUser(userId: string): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function sendAdminUserEmail(userId: string, input: { subject: string; message: string; actionUrl?: string; actionLabel?: string; brandVertical?: string | null }): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/email`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function sendAdminBulkEmail(input: { userIds: string[]; subject: string; message: string; actionUrl?: string; actionLabel?: string; brandVertical?: string | null }): Promise<void> {
    await expectOk('/api/admin/users/email-bulk', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function updateSerenatasProfile(userId: string, input: { profileType: 'client' | 'musician' | 'owner'; note?: string }): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/serenatas-profile`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
}

export async function logoutAdmin(): Promise<void> {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
        // Best effort.
    }
}

export async function completeAdminGoogleCallback(input: { code: string; state: string | null }): Promise<void> {
    await expectOk('/api/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function confirmAdminPasswordReset(input: { token: string; password: string }): Promise<void> {
    await expectOk('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export type AdminConversationItem = {
    threadId: string;
    channel: string;
    status: 'pending' | 'done';
    phone: string | null;
    name: string | null;
    lastMessage: string | null;
    sourceVertical: string | null;
    capturedByUserId: string | null;
    occurredAt: string;
    pendingSince: string;
    hoursPending: number;
    overdue24h: boolean;
    eventCount: number;
};

export type AdminConversationsSummary = {
    pendingCount: number;
    overdueCount: number;
    doneCount: number;
};

export async function fetchAdminConversations(status: 'pending' | 'done' | 'all' = 'pending'): Promise<{
    items: AdminConversationItem[];
    summary: AdminConversationsSummary;
}> {
    const data = await expectOk<{
        items?: AdminConversationItem[];
        summary?: AdminConversationsSummary;
    }>(`/api/admin/conversations?status=${encodeURIComponent(status)}`);
    return {
        items: data.items ?? [],
        summary: data.summary ?? { pendingCount: 0, overdueCount: 0, doneCount: 0 },
    };
}

export async function captureAdminWhatsappConversation(input: {
    phone: string;
    name?: string;
    message?: string;
    sourceVertical?: string;
}): Promise<{ threadId: string }> {
    const data = await expectOk<{ threadId?: string }>('/api/admin/conversations/whatsapp-manual', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (!data.threadId) throw new Error('No se recibió el hilo creado');
    return { threadId: data.threadId };
}

export async function updateAdminConversationStatus(
    threadId: string,
    input: { status: 'pending' | 'done'; note?: string },
): Promise<void> {
    await expectOk(`/api/admin/conversations/${encodeURIComponent(threadId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
}
