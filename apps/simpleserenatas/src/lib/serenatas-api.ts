import { apiFetch } from '@simple/utils';
import { API_BASE } from '@simple/config';

export type ActiveProfile = 'client' | 'musician' | 'coordinator';
export type SerenataPackageCode = 'duo' | 'trio' | 'cuarteto' | 'quinteto';
export type SerenataPackage = {
    code: SerenataPackageCode;
    label: string;
    musicians: number;
    duration: number;
    price: number;
    description: string;
    idealFor: string;
    bullets: string[];
    badge?: string;
};

export type SerenatasUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
    avatar?: string | null;
    provider?: string | null;
    status: 'active' | 'verified' | 'suspended';
};

export type MusicianProfile = {
    id: string;
    userId: string;
    instrument: string | null;
    instruments: string[];
    bio: string | null;
    comuna: string | null;
    region: string | null;
    lat: string | null;
    lng: string | null;
    isAvailable: boolean;
    availableNow: boolean;
    experienceYears: number;
};

export type ClientProfile = {
    id: string;
    userId: string;
    phone: string | null;
    comuna: string | null;
    region: string | null;
};

export type CoordinatorProfile = {
    id: string;
    userId: string;
    bio: string | null;
    comuna: string | null;
    region: string | null;
    workingComunas: string[];
    acceptsUrgent: boolean;
    minPrice: number | null;
    maxPrice: number | null;
    subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'cancelled';
    subscriptionPrice: number;
    commissionRateBps: number;
    commissionVatRateBps: number;
    trialEndsAt: string;
};

export type Serenata = {
    id: string;
    clientId: string | null;
    coordinatorId: string | null;
    groupId: string | null;
    source: 'own_lead' | 'platform_lead';
    status: 'payment_pending' | 'pending' | 'accepted_pending_group' | 'scheduled' | 'rejected' | 'expired' | 'cancelled' | 'completed';
    paymentStatus?: 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded' | null;
    paymentOrderId?: string | null;
    paidAt?: string | null;
    offerId?: string | null;
    offerStatus?: 'offered' | 'accepted' | 'rejected' | 'expired' | null;
    recipientName: string;
    clientPhone: string | null;
    address: string;
    comuna: string | null;
    region: string | null;
    lat: string | null;
    lng: string | null;
    eventDate: string;
    eventTime: string;
    duration: number;
    price: number | null;
    packageCode: SerenataPackageCode | null;
    eventType: string | null;
    message: string | null;
};

export type SerenatasPanelNotification = {
    id: string;
    type: 'service_lead' | 'listing_lead' | 'message_thread';
    title: string;
    time: string;
    href: string;
    createdAt: number;
};

export type SerenataGroupMember = {
    id: string;
    groupId: string;
    musicianId: string;
    instrument: string | null;
    status: 'invited' | 'accepted' | 'rejected' | 'cancelled';
    message: string | null;
    musicianName?: string;
};

export type SerenataGroup = {
    id: string;
    coordinatorId: string;
    name: string;
    date: string;
    status: 'draft' | 'active' | 'closed';
    members: SerenataGroupMember[];
};

export type MusicianDirectoryItem = Pick<MusicianProfile, 'id' | 'userId' | 'instrument' | 'instruments' | 'comuna' | 'region' | 'isAvailable' | 'availableNow' | 'experienceYears'> & {
    name: string;
};

export type Invitation = {
    id: string;
    groupId: string;
    status: SerenataGroupMember['status'];
    instrument: string | null;
    message: string | null;
    groupName: string;
    groupDate: string;
};

export type ApiEnvelope<T> = T & {
    ok: boolean;
    error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
    const response = await apiFetch<ApiEnvelope<T>>(`/api/serenatas${path}`, init);
    if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<T>;
    return response.data;
}

export const serenatasApi = {
    notifications: () => request<{ items: SerenatasPanelNotification[] }>('/notifications'),
    packages: () => request<{ items: SerenataPackage[] }>('/packages'),
    profiles: () => request<{ user: SerenatasUser; profiles: { client: ClientProfile | null; musician: MusicianProfile | null; coordinator: CoordinatorProfile | null } }>('/profiles'),
    updateUser: async (payload: { name?: string; phone?: string | null; avatarUrl?: string | null }): Promise<ApiEnvelope<{ user: SerenatasUser }>> => {
        const response = await apiFetch<ApiEnvelope<{ user: SerenatasUser }>>('/api/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<{ user: SerenatasUser }>;
        return response.data;
    },
    uploadAvatar: async (file: File): Promise<{ ok: boolean; url?: string; error?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', 'image');
        const response = await fetch(`${API_BASE}/api/media/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await response.json().catch(() => null) as { ok?: boolean; result?: { publicUrl?: string }; error?: string } | null;
        if (!response.ok || !data?.ok) return { ok: false, error: data?.error ?? 'No pudimos subir la imagen.' };
        return { ok: true, url: data.result?.publicUrl };
    },
    saveClientProfile: (payload: Partial<ClientProfile>) => request<{ profile: ClientProfile }>('/profiles/client', { method: 'PUT', body: JSON.stringify(payload) }),
    saveMusicianProfile: (payload: Partial<MusicianProfile>) => request<{ profile: MusicianProfile }>('/profiles/musician', { method: 'PUT', body: JSON.stringify(payload) }),
    saveCoordinatorProfile: (payload: Partial<CoordinatorProfile>) => request<{ profile: CoordinatorProfile }>('/profiles/coordinator', { method: 'PUT', body: JSON.stringify(payload) }),
    startCoordinatorTrial: () => request<{ profile: CoordinatorProfile }>('/subscriptions/coordinator/start-trial', { method: 'POST' }),
    musicians: () => request<{ items: MusicianDirectoryItem[] }>('/musicians'),
    serenatas: (date?: string) => request<{ items: Serenata[] }>(date ? `/serenatas?date=${encodeURIComponent(date)}` : '/serenatas'),
    clientSerenatas: (date?: string) => request<{ items: Serenata[] }>(date ? `/client/serenatas?date=${encodeURIComponent(date)}` : '/client/serenatas'),
    createSerenata: (payload: Partial<Serenata>) => request<{ item: Serenata }>('/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    requestSerenata: (payload: Partial<Serenata> & { packageCode: SerenataPackageCode }) => request<{ item: Serenata; offersCount: number }>('/client/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    updateSerenata: (id: string, payload: Partial<Serenata>) => request<{ item: Serenata }>(`/serenatas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    assignSerenataGroup: (id: string, payload: { mode: 'existing' | 'new'; groupId?: string | null; name?: string | null; musicianIds: string[]; message?: string | null }) => request<{ item: Serenata; group: SerenataGroup }>(`/serenatas/${id}/assign-group`, { method: 'POST', body: JSON.stringify(payload) }),
    updateSerenataStatus: (id: string, action: 'cancel' | 'complete') => request<{ item: Serenata }>(`/serenatas/${id}/${action}`, { method: 'POST' }),
    acceptSerenataOffer: (id: string) => request<{ item: Serenata }>(`/serenatas/${id}/accept-offer`, { method: 'POST' }),
    rejectSerenataOffer: (id: string) => request<{ offer: { id: string; status: string } }>(`/serenatas/${id}/reject-offer`, { method: 'POST' }),
    groups: () => request<{ items: SerenataGroup[] }>('/groups'),
    createGroup: (payload: { name: string; date: string; status: SerenataGroup['status'] }) => request<{ item: SerenataGroup }>('/groups', { method: 'POST', body: JSON.stringify(payload) }),
    inviteMember: (groupId: string, payload: { musicianId: string; instrument: string; message: string }) => request<{ member: SerenataGroupMember }>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
    invitations: () => request<{ items: Invitation[] }>('/invitations'),
    respondInvitation: (id: string, status: 'accepted' | 'rejected') => request<{ member: SerenataGroupMember }>(`/invitations/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) }),
    agenda: (date: string) => request<{ items: Serenata[] }>(`/agenda?date=${encodeURIComponent(date)}`),
    route: (date: string) => request<{ items: Serenata[] }>(`/route?date=${encodeURIComponent(date)}`),
};
