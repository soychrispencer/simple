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

export type AdminUserSnapshot = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
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
    realness: {
        label: string;
        score: number;
        reasons: string[];
    };
    subscriptions?: Record<string, unknown>;
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

export async function fetchAdminUsers(): Promise<AdminUserSnapshot[]> {
    const data = await expectOk<{ items?: AdminUserSnapshot[] }>('/api/admin/users');
    return data.items ?? [];
}

export async function updateAdminUser(userId: string, input: { name?: string; phone?: string | null; primaryVertical?: 'autos' | 'propiedades' | 'agenda' | null }): Promise<void> {
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

export async function sendAdminUserEmail(userId: string, input: { subject: string; message: string; actionUrl?: string; actionLabel?: string }): Promise<void> {
    await expectOk(`/api/admin/users/${encodeURIComponent(userId)}/email`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function sendAdminBulkEmail(input: { userIds: string[]; subject: string; message: string; actionUrl?: string; actionLabel?: string }): Promise<void> {
    await expectOk('/api/admin/users/email-bulk', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function updateSerenatasProfile(userId: string, input: { profileType: 'client' | 'musician' | 'owner'; removeClientProfile?: boolean; note?: string }): Promise<void> {
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
