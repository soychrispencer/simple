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

export type AdminSubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'free' | 'trial';

export type AdminUserSubscriptions = {
    agenda?: { plan: 'free' | 'pro' | 'pro_plus' | 'enterprise'; status: AdminSubscriptionStatus; expiresAt: string | null };
    autos?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    propiedades?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    serenatas?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    serenatasProvider?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
    serenatasMusician?: { planId: string | null; planName: string | null; status: AdminSubscriptionStatus; expiresAt: string | null };
};

export type AdminAccountSnapshot = {
    id: string;
    name: string;
    type: string;
    isPersonal: boolean;
    role: string;
    isDefault: boolean;
    subscriptions?: AdminUserSubscriptions;
};

export type AdminAgendaSubscription = {
    profileId: string;
    userId: string;
    userName: string;
    userEmail: string;
    displayName: string;
    slug: string;
    plan: 'free' | 'pro' | 'pro_plus' | 'enterprise';
    planExpiresAt: string | null;
    isPublished: boolean;
    whatsappExtraCredits?: number;
    status: 'active' | 'expired' | 'trial' | 'free';
    createdAt: string;
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
    accounts: AdminAccountSnapshot[];
    realness: {
        label: string;
        score: number;
        reasons: string[];
    };
    subscriptions?: AdminUserSubscriptions;
    agendaProfile?: {
        id: string;
        slug: string;
        displayName: string | null;
        isPublished: boolean;
        customDomain: string | null;
        customDomainStatus: string;
        whatsappExtraCredits: number;
    } | null;
    serenatas?: {
        client: boolean;
        musician: boolean;
        owner: boolean;
        instrument: string | null;
        ownerStatus: string | null;
        trialEndsAt: string | null;
        musicianTrialEndsAt: string | null;
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
    plan?: 'all' | 'paid' | 'trial' | 'free';
    page?: number;
    pageSize?: number;
} = {}): Promise<AdminUsersPage> {
    const params = new URLSearchParams();
    if (input.query?.trim()) params.set('q', input.query.trim());
    if (input.status && input.status !== 'all') params.set('status', input.status);
    if (input.vertical && input.vertical !== 'all') params.set('vertical', input.vertical);
    if (input.plan && input.plan !== 'all') params.set('plan', input.plan);
    params.set('page', String(input.page ?? 1));
    params.set('pageSize', String(input.pageSize ?? 25));
    const data = await expectOk<Partial<AdminUsersPage>>(`/api/admin/users?${params.toString()}`);
    const items = (data.items ?? []).map((user) => ({
        ...user,
        platformAccesses: user.platformAccesses ?? [],
        primaryPlatform: user.primaryPlatform ?? null,
        accounts: user.accounts ?? [],
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

export async function fetchAdminAgendaSubscriptions(): Promise<AdminAgendaSubscription[]> {
    const data = await expectOk<{ subscriptions?: AdminAgendaSubscription[] }>('/api/admin/agenda/subscriptions');
    return data.subscriptions ?? [];
}

export type AdminOverviewResponse = {
    stats: {
        usersTotal: number;
        usersRealActive: number;
        withActiveSubscription: number;
        agendaProfilesTotal: number;
        agendaPaidTotal: number;
        agendaTrialTotal: number;
        autosListingsTotal: number;
        propiedadesListingsTotal: number;
    };
    expiringSoon: Array<{
        id: string;
        name: string;
        email: string;
        plan: string;
        status: string;
        expiresAt: string | null;
    }>;
    recentUsers: AdminUserSnapshot[];
};

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
    return expectOk<AdminOverviewResponse>('/api/admin/overview');
}

export type AdminWhatsAppConnectionStatus = {
    configured: boolean;
    remindersEnabled: boolean;
    connected: boolean;
    webhookConfigured: boolean;
    phoneNumber: string | null;
    verifiedName: string | null;
    accountMode: string | null;
    platformType: string | null;
    businessAppConnected: boolean | null;
    qualityRating: string | null;
    checkedAt: string | null;
    error: 'missing_configuration' | 'meta_unavailable' | null;
};

export async function fetchAdminWhatsAppConnectionStatus(): Promise<AdminWhatsAppConnectionStatus> {
    const data = await expectOk<{ status: AdminWhatsAppConnectionStatus }>('/api/admin/whatsapp/platform-status');
    return data.status;
}

export async function completeAdminWhatsAppCoexistence(input: {
    code: string;
    wabaId: string;
    phoneNumberId?: string;
}): Promise<{ subscribed: boolean; connection: AdminWhatsAppConnectionStatus }> {
    const data = await expectOk<{ subscribed: boolean; connection: AdminWhatsAppConnectionStatus }>('/api/admin/whatsapp/coexistence/complete', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return { subscribed: data.subscribed, connection: data.connection };
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

export async function updateAdminUserSubscriptions(userId: string, accountId: string | null, subscriptions: Record<string, unknown>): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/subscriptions`, {
        method: 'PATCH',
        body: JSON.stringify({ accountId, subscriptions }),
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
    email: string | null;
    company: string | null;
    lastMessage: string | null;
    sourceVertical: string | null;
    purpose: string | null;
    campaignName: string | null;
    activities: AdminConversationActivity[];
    capturedByUserId: string | null;
    occurredAt: string;
    pendingSince: string;
    hoursPending: number;
    overdue24h: boolean;
    eventCount: number;
};

export type AdminConversationActivity = {
    id: string;
    direction: 'inbound' | 'outbound' | 'status';
    channel: string | null;
    message: string | null;
    sourceVertical: string | null;
    purpose: string | null;
    campaignName: string | null;
    occurredAt: string;
};

export type AdminConversationsSummary = {
    pendingCount: number;
    overdueCount: number;
    doneCount: number;
};

export async function fetchAdminConversations(
    status: 'pending' | 'done' | 'all' = 'pending',
    vertical = 'all',
): Promise<{
    items: AdminConversationItem[];
    summary: AdminConversationsSummary;
}> {
    const data = await expectOk<{
        items?: AdminConversationItem[];
        summary?: AdminConversationsSummary;
    }>(`/api/admin/conversations?status=${encodeURIComponent(status)}&vertical=${encodeURIComponent(vertical)}`);
    return {
        items: data.items ?? [],
        summary: data.summary ?? { pendingCount: 0, overdueCount: 0, doneCount: 0 },
    };
}

export async function captureAdminConversationResponse(input: {
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
    phone?: string;
    email?: string;
    name?: string;
    message: string;
    sourceVertical: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general';
    purpose: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other';
    campaignName?: string;
}): Promise<{ threadId: string }> {
    const data = await expectOk<{ threadId?: string }>('/api/admin/conversations/inbound-manual', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (!data.threadId) throw new Error('No se recibió el hilo creado');
    return { threadId: data.threadId };
}

export async function recordAdminOutboundMessage(input: {
    channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
    phone?: string;
    email?: string;
    name?: string;
    company?: string;
    message: string;
    sourceVertical: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general';
    purpose: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other';
    campaignName?: string;
}): Promise<{ threadId: string }> {
    const data = await expectOk<{ threadId?: string }>('/api/admin/conversations/outbound-manual', {
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
