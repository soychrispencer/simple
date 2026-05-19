import { apiFetch } from '@simple/utils';
import { API_BASE } from '@simple/config';

export type ActiveProfile = 'client' | 'musician' | 'owner';
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
    whatsappEnabled?: boolean;
    avatarUrl?: string | null;
    avatar?: string | null;
    provider?: string | null;
    pendingEmail?: string | null;
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
    /** Nombres de comunas (catálogo @simple/utils), alineado con serenata.comuna */
    workZones: string[];
};

export type ClientProfile = {
    id: string;
    userId: string;
    phone: string | null;
    comuna: string | null;
    region: string | null;
};

export type OwnerProfile = {
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

export type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    owner: OwnerProfile | null;
};

export type ProviderGroupStatus = 'draft' | 'active' | 'paused' | 'rejected';
export type ProviderBookingMode = 'manual' | 'auto_if_available' | 'auto_decline';

export type ProviderGroupAvailabilityRule = {
    id?: string;
    providerGroupId?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
};

export type ProviderGroupAvailability = {
    providerGroupId: string;
    slaHours: number;
    bookingMode: ProviderBookingMode;
    bufferMinutes: number;
    rules: ProviderGroupAvailabilityRule[];
};

export type ProviderGroup = {
    id: string;
    ownerUserId: string;
    ownerId: string | null;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    phone: string | null;
    whatsapp: string | null;
    region: string | null;
    comunaBase: string | null;
    serviceComunas: string[];
    status: ProviderGroupStatus;
    isVerified: boolean;
    ratingAverage: number;
    ratingCount: number;
    slaHours?: number;
    bookingMode?: ProviderBookingMode;
    bufferMinutes?: number;
    startingPrice?: number | null;
    activeServicesCount?: number;
    servicesPreview?: Pick<ProviderGroupService, 'id' | 'name' | 'price' | 'musiciansCount' | 'durationMinutes'>[];
    createdAt: string;
    updatedAt: string;
};

export type ProviderGroupService = {
    id: string;
    providerGroupId: string;
    name: string;
    description: string | null;
    musiciansCount: number;
    durationMinutes: number;
    price: number;
    currency: string;
    eventType: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type ProviderGroupApplication = {
    id: string;
    userId: string;
    providerGroupId: string | null;
    name: string;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    region: string | null;
    comunaBase: string | null;
    serviceComunas: string[];
    status: 'pending' | 'approved' | 'rejected';
    reviewNotes: string | null;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ProviderGroupMember = {
    id: string;
    providerGroupId: string;
    musicianId: string;
    role: 'owner' | 'musician';
    instruments: string[];
    status: 'invited' | 'active' | 'inactive' | 'removed' | 'rejected';
    message: string | null;
    invitedByUserId: string | null;
    respondedAt: string | null;
    createdAt: string;
    updatedAt: string;
    musicianName?: string | null;
    instrument?: string | null;
    availableNow?: boolean;
    comuna?: string | null;
    region?: string | null;
};

export type Serenata = {
    id: string;
    clientId: string | null;
    ownerId: string | null;
    providerGroupId: string | null;
    selectedServiceId: string | null;
    groupId: string | null;
    source: 'own_lead' | 'platform_lead';
    status: 'payment_pending' | 'pending' | 'pending_open' | 'accepted_pending_group' | 'scheduled' | 'rejected' | 'expired' | 'cancelled' | 'completed';
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
    eventTime: string | null;
    flexibleSchedule?: boolean;
    duration: number;
    price: number | null;
    packageCode: SerenataPackageCode | null;
    eventType: string | null;
    message: string | null;
    completedAt?: string | null;
    completedBy?: string | null;
    cancelReason?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    clientConfirmedAt?: string | null;
    closureReminderSentAt?: string | null;
    responseDueAt?: string | null;
    expiredAt?: string | null;
    expiredReason?: string | null;
    pendingReminderSentAt?: string | null;
};

export type SerenatasPanelNotification = {
    id: string;
    /** Tipo para iconografía del header (`@simple/marketplace-header`). */
    type: 'service_lead' | 'listing_lead' | 'message_thread';
    /** Tipo original en DB (`serenata_notifications.type`). */
    kind?: string;
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
    availableNow?: boolean;
};

export type SerenataGroup = {
    id: string;
    ownerId: string;
    providerGroupId?: string | null;
    name: string;
    date: string;
    status: 'draft' | 'active' | 'closed';
    members: SerenataGroupMember[];
};

export type MusicianDirectoryItem = Pick<MusicianProfile, 'id' | 'userId' | 'instrument' | 'instruments' | 'comuna' | 'region' | 'workZones' | 'isAvailable' | 'availableNow' | 'experienceYears'> & {
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
    serenataId?: string | null;
    recipientName?: string | null;
    eventDate?: string | null;
    eventTime?: string | null;
    address?: string | null;
    comuna?: string | null;
    ownerName?: string | null;
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

function withActiveProfile(path: string, as?: ActiveProfile) {
    if (!as) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}as=${encodeURIComponent(as)}`;
}

export const serenatasApi = {
    notifications: () => request<{ items: SerenatasPanelNotification[] }>('/notifications'),
    packages: () => request<{ items: SerenataPackage[] }>('/packages'),
    profiles: () => request<{ user: SerenatasUser; profiles: Profiles }>('/profiles'),
    updateUser: async (payload: {
        name?: string;
        phone?: string | null;
        avatarUrl?: string | null;
        whatsappEnabled?: boolean;
    }): Promise<ApiEnvelope<{ user: SerenatasUser }>> => {
        const response = await apiFetch<ApiEnvelope<{ user: SerenatasUser }>>('/api/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<{ user: SerenatasUser }>;
        return response.data;
    },
    uploadAvatar: async (file: Blob, filename = 'avatar.jpg'): Promise<{ ok: boolean; url?: string; error?: string }> => {
        const formData = new FormData();
        formData.append('file', file, filename);
        formData.append('fileType', 'image');
        const response = await fetch(`${API_BASE}/api/media/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await response.json().catch(() => null) as { ok?: boolean; result?: { publicUrl?: string }; error?: string } | null;
        if (!response.ok || !data?.ok) {
            const fallback =
                response.status === 401 ? 'Debes iniciar sesión para subir tu avatar.'
                : response.status === 403 ? 'Verifica tu correo antes de subir tu avatar.'
                : response.status === 503 ? 'El almacenamiento de archivos no está configurado en el servidor.'
                : 'No pudimos subir la imagen.';
            return { ok: false, error: data?.error ?? fallback };
        }
        if (!data.result?.publicUrl) {
            return { ok: false, error: 'El servidor no devolvió la URL de la imagen.' };
        }
        return { ok: true, url: data.result.publicUrl };
    },
    saveClientProfile: (payload: Partial<ClientProfile>) => request<{ profile: ClientProfile }>('/profiles/client', { method: 'PUT', body: JSON.stringify(payload) }),
    saveMusicianProfile: (payload: Partial<MusicianProfile>) => request<{ profile: MusicianProfile }>('/profiles/musician', { method: 'PUT', body: JSON.stringify(payload) }),
    setMusicianAvailableNow: (availableNow: boolean) => request<{ profile: MusicianProfile }>('/profiles/musician', { method: 'PUT', body: JSON.stringify({ availableNow }) }),
    saveOwnerProfile: (payload: Partial<OwnerProfile>) => request<{ profile: OwnerProfile }>('/profiles/owner', { method: 'PUT', body: JSON.stringify(payload) }),
    /** Alta gratuita de dueño (ruta legacy `start-trial`). */
    startOwnerTrial: () => request<{ profile: OwnerProfile }>('/subscriptions/owner/start-trial', { method: 'POST' }),
    registerOwner: () => request<{ profile: OwnerProfile }>('/subscriptions/owner/start-trial', { method: 'POST' }),
    musicians: () => request<{ items: MusicianDirectoryItem[] }>('/musicians'),
    serenatas: (date?: string, as?: ActiveProfile, options?: { needsClosure?: boolean }) => {
        const params = new URLSearchParams();
        if (date) params.set('date', date);
        if (options?.needsClosure) params.set('needsClosure', '1');
        const query = params.toString();
        return request<{ items: Serenata[] }>(
            withActiveProfile(query ? `/serenatas?${query}` : '/serenatas', as),
        );
    },
    clientSerenatas: (date?: string) => request<{ items: Serenata[] }>(date ? `/client/serenatas?date=${encodeURIComponent(date)}` : '/client/serenatas'),
    cancelClientSerenata: (id: string, payload?: { cancelReason?: string }) => request<{ item: Serenata }>(
        `/client/serenatas/${id}/cancel`,
        { method: 'POST', body: JSON.stringify(payload ?? {}) },
    ),
    marketplaceAvailability: (slug: string, date: string, serviceId: string) => request<{
        date: string;
        serviceId: string;
        slots: string[];
        dayStart?: string | null;
        dayEnd?: string | null;
        bufferMinutes?: number;
    }>(
        `/marketplace/groups/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`,
    ),
    createSerenata: (payload: Partial<Serenata>) => request<{ item: Serenata }>('/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    requestSerenata: (payload: Partial<Serenata> & { packageCode: SerenataPackageCode }) => request<{ item: Serenata; offersCount: number }>('/client/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    requestMarketplaceSerenata: (payload: {
        providerGroupId: string;
        serviceId: string;
        recipientName: string;
        clientPhone?: string | null;
        address: string;
        comuna: string;
        region: string;
        lat?: number | null;
        lng?: number | null;
        eventDate: string;
        eventTime?: string | null;
        flexibleSchedule?: boolean;
        message?: string | null;
    }) => request<{ item: Serenata; offersCount: number }>('/client/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    marketplaceGroups: (filters?: { comuna?: string; region?: string }) => {
        const params = new URLSearchParams();
        if (filters?.comuna) params.set('comuna', filters.comuna);
        if (filters?.region) params.set('region', filters.region);
        const query = params.toString();
        return request<{ items: ProviderGroup[] }>(query ? `/marketplace/groups?${query}` : '/marketplace/groups');
    },
    marketplaceGroupBySlug: (slug: string) => request<{ item: ProviderGroup }>(`/marketplace/groups/${encodeURIComponent(slug)}`),
    marketplaceGroupServices: (groupId: string) => request<{ items: ProviderGroupService[] }>(`/marketplace/groups/${groupId}/services`),
    myProviderGroups: () => request<{ items: ProviderGroup[] }>('/provider-groups/me'),
    myProviderGroupApplications: () => request<{ items: ProviderGroupApplication[] }>('/provider-groups/applications/me'),
    submitProviderGroupApplication: (payload: Partial<ProviderGroupApplication> & { name: string }) => request<{ item: ProviderGroupApplication }>('/provider-groups/applications', { method: 'POST', body: JSON.stringify(payload) }),
    createProviderGroup: (payload: Partial<ProviderGroup> & { name: string }) => request<{ item: ProviderGroup }>('/provider-groups', { method: 'POST', body: JSON.stringify(payload) }),
    updateProviderGroup: (id: string, payload: Partial<ProviderGroup>) => request<{ item: ProviderGroup }>(`/provider-groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    providerGroupAvailability: (groupId: string) => request<{ item: ProviderGroupAvailability }>(`/provider-groups/${groupId}/availability`),
    updateProviderGroupAvailability: (
        groupId: string,
        payload: Partial<Pick<ProviderGroupAvailability, 'slaHours' | 'bookingMode' | 'bufferMinutes'>> & { rules?: ProviderGroupAvailabilityRule[] },
    ) => request<{ item: ProviderGroupAvailability }>(`/provider-groups/${groupId}/availability`, { method: 'PUT', body: JSON.stringify(payload) }),
    providerGroupServices: (groupId: string) => request<{ items: ProviderGroupService[] }>(`/provider-groups/${groupId}/services`),
    createProviderGroupService: (groupId: string, payload: Partial<ProviderGroupService> & { name: string; price: number }) => request<{ item: ProviderGroupService }>(`/provider-groups/${groupId}/services`, { method: 'POST', body: JSON.stringify(payload) }),
    updateProviderGroupService: (groupId: string, serviceId: string, payload: Partial<ProviderGroupService>) => request<{ item: ProviderGroupService }>(`/provider-groups/${groupId}/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteProviderGroupService: (groupId: string, serviceId: string) => request<Record<string, never>>(`/provider-groups/${groupId}/services/${serviceId}`, { method: 'DELETE' }),
    providerGroupMembers: (groupId: string) => request<{ items: ProviderGroupMember[] }>(`/provider-groups/${groupId}/members`),
    inviteProviderGroupMember: (groupId: string, payload: { musicianId: string; role?: ProviderGroupMember['role']; instruments?: string[]; message?: string | null }) => request<{ member: ProviderGroupMember }>(`/provider-groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
    updateProviderGroupMember: (groupId: string, memberId: string, payload: Partial<ProviderGroupMember>) => request<{ member: ProviderGroupMember }>(`/provider-groups/${groupId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    providerGroupRequests: (groupId: string) => request<{ items: Serenata[] }>(`/provider-groups/${groupId}/requests`),
    updateSerenata: (id: string, payload: Partial<Serenata>) => request<{ item: Serenata }>(`/serenatas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    assignSerenataGroup: (id: string, payload: { mode: 'existing' | 'new'; groupId?: string | null; name?: string | null; musicianIds: string[]; message?: string | null }) => request<{ item: Serenata; group: SerenataGroup }>(`/serenatas/${id}/assign-group`, { method: 'POST', body: JSON.stringify(payload) }),
    updateSerenataStatus: (id: string, action: 'cancel' | 'complete', body?: { cancelReason?: string }) => request<{ item: Serenata }>(
        `/serenatas/${id}/${action}`,
        { method: 'POST', body: body ? JSON.stringify(body) : undefined },
    ),
    confirmClientSerenata: (id: string) => request<{ item: Serenata }>(`/serenatas/${id}/client-confirm`, { method: 'POST' }),
    acceptSerenataOffer: (id: string) => request<{ item: Serenata }>(`/serenatas/${id}/accept-offer`, { method: 'POST' }),
    rejectSerenataOffer: (id: string) => request<{ offer: { id: string; status: string } }>(`/serenatas/${id}/reject-offer`, { method: 'POST' }),
    groups: () => request<{ items: SerenataGroup[] }>('/groups'),
    createGroup: (payload: { name: string; date: string; status: SerenataGroup['status'] }) => request<{ item: SerenataGroup }>('/groups', { method: 'POST', body: JSON.stringify(payload) }),
    inviteMember: (groupId: string, payload: { musicianId: string; instrument: string; message: string }) => request<{ member: SerenataGroupMember }>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
    invitations: () => request<{ items: Invitation[] }>('/invitations'),
    respondInvitation: (id: string, status: 'accepted' | 'rejected') => request<{ member: SerenataGroupMember }>(`/invitations/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) }),
    agenda: (date: string, as?: ActiveProfile) => request<{ items: Serenata[] }>(
        withActiveProfile(`/agenda?date=${encodeURIComponent(date)}`, as),
    ),
    route: (date: string, as?: ActiveProfile) => request<{ items: Serenata[] }>(
        withActiveProfile(`/route?date=${encodeURIComponent(date)}`, as),
    ),
    requestEmailChange: async (newEmail: string): Promise<ApiEnvelope<{ pendingEmail?: string }>> => {
        const response = await apiFetch<ApiEnvelope<{ pendingEmail?: string }>>('/api/accounts/request-email-change', {
            method: 'POST',
            body: JSON.stringify({ newEmail }),
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' };
        return response.data;
    },
    disconnectGoogle: async (): Promise<ApiEnvelope<{ disconnected?: boolean; user?: SerenatasUser }>> => {
        const response = await apiFetch<ApiEnvelope<{ disconnected?: boolean; user?: SerenatasUser }>>('/api/auth/google/disconnect', {
            method: 'POST',
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' };
        return response.data;
    },
};
