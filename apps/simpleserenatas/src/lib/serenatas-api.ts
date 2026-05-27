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
    role?: string;
    phone?: string | null;
    whatsappEnabled?: boolean;
    whatsappNotifyInvitations?: boolean;
    whatsappNotifyRequests?: boolean;
    whatsappNotifyAgenda?: boolean;
    whatsappNotifyAccount?: boolean;
    emailNotifyInvitations?: boolean;
    emailNotifyRequests?: boolean;
    emailNotifyAgenda?: boolean;
    emailNotifyAccount?: boolean;
    inAppNotificationsEnabled?: boolean;
    emailDigestFrequency?: 'off' | 'daily' | 'weekly';
    avatarUrl?: string | null;
    avatar?: string | null;
    provider?: string | null;
    hasPassword?: boolean;
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
    /** @deprecated Solo dueños; el músico usa comuna/región. */
    workZones: string[];
    hasInstrument: boolean;
    hasMariachiAttire: boolean;
};

/** Ficha pública de músico para listados y modal de detalle. */
export type MusicianPublicProfile = MusicianProfile & {
    name: string;
    avatarUrl?: string | null;
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

export type SerenataBillingPlanId = 'free' | 'pro';

export type SerenataMePlan = {
    plan: SerenataBillingPlanId;
    planLabel: string;
    alwaysFreeMonthly: true;
    ownerOwnSerenataCommissionPercent: 0;
    commissionAppBps: number;
    commissionAppPercent: number;
    commissionVatBps: number;
    commissionVatPercent: number;
    proPriceMonthly: number;
    proPriceMonthlyNet: number;
    proPriceMonthlyWithVat: number;
    proCheckoutAvailable: boolean;
    exampleGrossClp: number;
    example: {
        grossClp: number;
        commissionClp: number;
        vatOnCommissionClp: number;
        totalDeductionClp: number;
    };
    constants: {
        APP_COMMISSION_FREE_BPS: number;
        APP_COMMISSION_PRO_BPS: number;
        COMMISSION_VAT_BPS: number;
    };
};

export type Profiles = {
    client: ClientProfile | null;
    musician: MusicianProfile | null;
    owner: OwnerProfile | null;
};

export type ProviderGroupStatus = 'draft' | 'active' | 'paused' | 'rejected';
export type ProviderBookingMode = 'manual' | 'auto_if_available' | 'auto_decline';

export type ProviderBankTransferData = {
    bank: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
    holderEmail: string;
    alias?: string;
};

export type ProviderGroupAvailabilityRule = {
    id?: string;
    providerGroupId?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
};

export type ProviderGroupBlockedSlot = {
    id: string;
    providerGroupId: string;
    startsAt: string;
    endsAt: string;
    reason: string | null;
    createdAt?: string;
};

export type ProviderGroupAvailability = {
    providerGroupId: string;
    slaHours: number;
    bookingMode: ProviderBookingMode;
    bufferMinutes: number;
    rules: ProviderGroupAvailabilityRule[];
    blockedSlots: ProviderGroupBlockedSlot[];
};

export type ProviderGroupReview = {
    rating: number;
    confirmedAt: string;
    comment?: string | null;
};

export type ProviderGroupRatingSummary = {
    average: number;
    count: number;
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
    requiresAdvancePayment?: boolean;
    advancePaymentInstructions?: string | null;
    acceptsCash?: boolean;
    acceptsTransfer?: boolean;
    acceptsMp?: boolean;
    acceptsPaymentLink?: boolean;
    paymentLinkUrl?: string | null;
    bankTransferData?: ProviderBankTransferData | null;
    startingPrice?: number | null;
    activeServicesCount?: number;
    servicesPreview?: Pick<ProviderGroupService, 'id' | 'name' | 'price' | 'musiciansCount' | 'durationMinutes' | 'songsIncluded'>[];
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
    songsIncluded: number;
    repertoirePolicy: 'any_active' | 'curated_only';
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type CatalogSong = {
    id: string;
    title: string;
    artist: string | null;
    tags: string[];
    isPreset: boolean;
    createdAt: string;
    updatedAt: string;
};

export type RepertoireSong = {
    id: string;
    providerGroupId: string;
    catalogSongId: string | null;
    title: string;
    artist: string | null;
    tags: string[];
    isActive: boolean;
    sortOrder: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

export type SerenataSongSelection = {
    id: string;
    serenataId: string;
    repertoireSongId: string | null;
    kind: 'client_preference' | 'setlist';
    title: string;
    artist: string | null;
    sortOrder: number;
    clientNote: string | null;
    createdAt: string;
};

export type SongScore = {
    id: string;
    repertoireSongId: string;
    instrument: string;
    format: string;
    storageUrl: string;
    originalFilename: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ProviderGroupMember = {
    id: string;
    providerGroupId: string;
    musicianId: string;
    role: 'owner' | 'musician';
    instruments: string[];
    status: 'invited' | 'active' | 'removed' | 'rejected';
    message: string | null;
    invitedByUserId: string | null;
    respondedAt: string | null;
    createdAt: string;
    updatedAt: string;
    musicianName?: string | null;
    instrument?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    experienceYears?: number;
    workZones?: string[];
    availableNow?: boolean;
    comuna?: string | null;
    region?: string | null;
};

export type ProviderGroupMemberInvite = {
    id: string;
    providerGroupId: string;
    invitedByUserId: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    musicianId: string | null;
    createdAt: string;
    updatedAt: string;
};

export type Serenata = {
    id: string;
    clientId: string | null;
    ownerId: string | null;
    providerGroupId: string | null;
    providerGroupSlug?: string | null;
    selectedServiceId: string | null;
    groupId: string | null;
    source: 'own_lead' | 'platform_lead';
    status: 'payment_pending' | 'pending' | 'pending_open' | 'accepted_pending_group' | 'scheduled' | 'rejected' | 'expired' | 'cancelled' | 'completed';
    paymentStatus?: 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded' | null;
    paymentOrderId?: string | null;
    paidAt?: string | null;
    ownerCollectionMethod?: 'cash' | 'card' | 'transfer' | 'other' | 'payment_link' | null;
    ownerPayoutStatus?: 'pending' | 'paid' | null;
    ownerPayoutAt?: string | null;
    ownerPayoutReference?: string | null;
    ownerPayoutAmount?: number | null;
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
    clientRating?: number | null;
    closureReminderSentAt?: string | null;
    responseDueAt?: string | null;
    expiredAt?: string | null;
    expiredReason?: string | null;
    pendingReminderSentAt?: string | null;
    setlistStatus?: 'pending_owner' | 'confirmed';
    songsIncludedAtBooking?: number | null;
    setlistConfirmedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type UserNotificationLogItem = {
    id: string;
    channel: string;
    eventType: string;
    summary: string;
    createdAt: number;
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
    isRead?: boolean;
};

export type SerenataGroupMember = {
    id: string;
    groupId: string;
    musicianId: string;
    instrument: string | null;
    slotIndex?: number | null;
    status: 'invited' | 'accepted' | 'rejected' | 'cancelled';
    message: string | null;
    musicianName?: string;
    instruments?: string[];
    avatarUrl?: string | null;
    comuna?: string | null;
    region?: string | null;
    availableNow?: boolean;
};

export type SerenataGroupPendingInvite = {
    id: string;
    groupId: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    status: 'pending' | 'accepted' | 'cancelled';
    createdAt: string;
};

export type SerenataGroup = {
    id: string;
    ownerId: string;
    providerGroupId?: string | null;
    name: string;
    date: string;
    maxMusicians?: number | null;
    requiredInstruments?: string[];
    status: 'draft' | 'active' | 'closed';
    members: SerenataGroupMember[];
    pendingInvites?: SerenataGroupPendingInvite[];
};

export type GroupInviteMode = 'email' | 'whatsapp' | 'app';

export type MusicianDirectoryItem = Pick<MusicianProfile, 'id' | 'userId' | 'instrument' | 'instruments' | 'comuna' | 'region' | 'workZones' | 'isAvailable' | 'availableNow' | 'experienceYears' | 'bio'> & {
    name: string;
    avatarUrl?: string | null;
};

export type SerenataBillingOrder = {
    id: string;
    vertical: string;
    kind: string;
    title: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    appliedAt?: string | null;
    appliedResourceId?: string | null;
    metadata?: Record<string, unknown> | null;
};

export type MusicianPayout = {
    id: string;
    serenataId: string;
    musicianId: string | null;
    musicianName: string | null;
    amount: number;
    status: 'pending' | 'paid';
    paymentMethod: string | null;
    paidAt: string | null;
    notes: string | null;
    recipientName?: string;
    eventDate?: string;
    eventTime?: string | null;
    serenataPrice?: number | null;
};

export type MusicianPayoutLineInput = {
    musicianId?: string | null;
    musicianName?: string | null;
    amount: number;
    status?: 'pending' | 'paid';
    paymentMethod?: string | null;
    notes?: string | null;
};

export type Invitation = {
    id: string;
    groupId: string;
    status: SerenataGroupMember['status'] | ProviderGroupMember['status'];
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
    markNotificationRead: (id: string) =>
        request<Record<string, never>>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    markAllNotificationsRead: () =>
        request<Record<string, never>>('/notifications/mark-all-read', { method: 'POST' }),
    notificationLog: async (): Promise<ApiEnvelope<{ items: UserNotificationLogItem[] }>> => {
        const response = await apiFetch<ApiEnvelope<{ items: UserNotificationLogItem[] }>>('/api/auth/me/notification-log');
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<{ items: UserNotificationLogItem[] }>;
        return response.data;
    },
    packages: () => request<{ items: SerenataPackage[] }>('/packages'),
    profiles: () => request<{ user: SerenatasUser; profiles: Profiles }>('/profiles'),
    mePlan: () => request<SerenataMePlan>('/me/plan'),
    billingHistory: () => request<{ items: SerenataBillingOrder[] }>('/me/billing-history'),
    ownerMusicianPayouts: (status?: 'pending' | 'paid') => {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return request<{ items: MusicianPayout[] }>(`/serenatas/owner/musician-payouts${query}`);
    },
    musicianPayouts: (status?: 'pending' | 'paid') => {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return request<{ items: MusicianPayout[] }>(`/serenatas/musician/payouts${query}`);
    },
    serenataPayouts: (serenataId: string) => request<{ items: MusicianPayout[] }>(`/serenatas/${serenataId}/payouts`),
    saveSerenataPayouts: (serenataId: string, lines: MusicianPayoutLineInput[]) => request<{ items: MusicianPayout[] }>(
        `/serenatas/${serenataId}/payouts`,
        { method: 'PUT', body: JSON.stringify({ lines }) },
    ),
    cancelProSubscription: () =>
        request<{ ok: boolean; message?: string; error?: string }>('/me/subscription/cancel', { method: 'POST' }),
    updateUser: async (payload: {
        name?: string;
        phone?: string | null;
        avatarUrl?: string | null;
        whatsappEnabled?: boolean;
        whatsappNotifyInvitations?: boolean;
        whatsappNotifyRequests?: boolean;
        whatsappNotifyAgenda?: boolean;
        whatsappNotifyAccount?: boolean;
        emailNotifyInvitations?: boolean;
        emailNotifyRequests?: boolean;
        emailNotifyAgenda?: boolean;
        emailNotifyAccount?: boolean;
        inAppNotificationsEnabled?: boolean;
        emailDigestFrequency?: 'off' | 'daily' | 'weekly';
    }): Promise<ApiEnvelope<{ user: SerenatasUser }>> => {
        const response = await apiFetch<ApiEnvelope<{ user: SerenatasUser }>>('/api/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<{ user: SerenatasUser }>;
        return response.data;
    },
    deleteAccount: async (payload: { password?: string; confirmPhrase?: string }): Promise<ApiEnvelope<Record<string, never>>> => {
        const response = await apiFetch<ApiEnvelope<Record<string, never>>>('/api/auth/me', {
            method: 'DELETE',
            body: JSON.stringify(payload),
        });
        if (!response.data) {
            return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<Record<string, never>>;
        }
        return response.data;
    },
    sendNotificationTest: async (
        channel: 'email' | 'whatsapp' = 'email',
    ): Promise<ApiEnvelope<{ channel: string; message?: string; deferredQuietHours?: boolean }>> => {
        const response = await apiFetch<
            ApiEnvelope<{ channel: string; message?: string; deferredQuietHours?: boolean }>
        >('/api/auth/me/test-notification', {
            method: 'POST',
            body: JSON.stringify({ channel }),
        });
        if (!response.data) {
            return { ok: false, error: 'No pudimos conectar con el servidor.' } as ApiEnvelope<{
                channel: string;
                message?: string;
                deferredQuietHours?: boolean;
            }>;
        }
        return response.data;
    },
    uploadAvatar: async (
        file: Blob,
        filename = 'avatar.webp',
        purpose: 'avatar' | 'cover' = 'avatar',
    ): Promise<{ ok: boolean; url?: string; error?: string }> => {
        const formData = new FormData();
        formData.append('file', file, filename);
        formData.append('fileType', 'image');
        formData.append('purpose', purpose);
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
    registerOwner: () => request<{ profile: OwnerProfile }>('/subscriptions/owner/start-trial', { method: 'POST' }),
    musicians: () => request<{ items: MusicianDirectoryItem[] }>('/musicians'),
    musicianProfile: (musicianId: string) => request<{ item: MusicianPublicProfile }>(`/musicians/${musicianId}`),
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
    createSerenata: (payload: Partial<Serenata> & {
        songSelections?: Array<{ repertoireSongId: string; clientNote?: string | null }>;
    }) => request<{ item: Serenata }>('/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
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
        songSelections?: Array<{ repertoireSongId: string; clientNote?: string | null }>;
    }) => request<{ item: Serenata; offersCount: number }>('/client/serenatas', { method: 'POST', body: JSON.stringify(payload) }),
    marketplaceGroups: (filters?: {
        comuna?: string;
        region?: string;
        q?: string;
        date?: string;
        sort?: string;
        limit?: number;
        offset?: number;
    }) => {
        const params = new URLSearchParams();
        if (filters?.comuna) params.set('comuna', filters.comuna);
        if (filters?.region) params.set('region', filters.region);
        if (filters?.q) params.set('q', filters.q);
        if (filters?.date) params.set('date', filters.date);
        if (filters?.sort && filters.sort !== 'recommended') params.set('sort', filters.sort);
        if (filters?.limit != null) params.set('limit', String(filters.limit));
        if (filters?.offset != null) params.set('offset', String(filters.offset));
        const query = params.toString();
        return request<{
            items: ProviderGroup[];
            total: number;
            hasMore: boolean;
            nextOffset: number | null;
        }>(query ? `/marketplace/groups?${query}` : '/marketplace/groups');
    },
    marketplaceGroupBySlug: (slug: string) => request<{ item: ProviderGroup }>(`/marketplace/groups/${encodeURIComponent(slug)}`),
    marketplaceGroupReviews: (slug: string) =>
        request<{ summary: ProviderGroupRatingSummary; items: ProviderGroupReview[] }>(
            `/marketplace/groups/${encodeURIComponent(slug)}/reviews`,
        ),
    marketplaceGroupServices: (groupId: string) => request<{ items: ProviderGroupService[] }>(`/marketplace/groups/${groupId}/services`),
    myProviderGroups: () => request<{ items: ProviderGroup[] }>('/provider-groups/me'),
    createProviderGroup: (payload: Partial<ProviderGroup> & { name: string }) => request<{ item: ProviderGroup }>('/provider-groups', { method: 'POST', body: JSON.stringify(payload) }),
    providerGroupAutoAcceptEligibility: (groupId: string) => request<{ eligible: boolean; blockingCount: number }>(`/provider-groups/${groupId}/auto-accept-eligibility`),
    updateProviderGroup: (id: string, payload: Partial<ProviderGroup>) => request<{ item: ProviderGroup }>(`/provider-groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    providerGroupAvailability: (groupId: string) => request<{ item: ProviderGroupAvailability }>(`/provider-groups/${groupId}/availability`),
    updateProviderGroupAvailability: (
        groupId: string,
        payload: Partial<Pick<ProviderGroupAvailability, 'slaHours' | 'bookingMode' | 'bufferMinutes'>> & { rules?: ProviderGroupAvailabilityRule[] },
    ) => request<{ item: ProviderGroupAvailability }>(`/provider-groups/${groupId}/availability`, { method: 'PUT', body: JSON.stringify(payload) }),
    createProviderGroupBlockedSlot: (
        groupId: string,
        body: { startsAt: string; endsAt: string; reason?: string },
    ) => request<{ slot: ProviderGroupBlockedSlot }>(`/provider-groups/${groupId}/availability/blocked-slots`, { method: 'POST', body: JSON.stringify(body) }),
    deleteProviderGroupBlockedSlot: (groupId: string, slotId: string) => request<Record<string, never>>(
        `/provider-groups/${groupId}/availability/blocked-slots/${slotId}`,
        { method: 'DELETE' },
    ),
    providerGroupServices: (groupId: string) => request<{ items: ProviderGroupService[] }>(`/provider-groups/${groupId}/services`),
    createProviderGroupService: (groupId: string, payload: Partial<ProviderGroupService> & { name: string; price: number }) => request<{ item: ProviderGroupService }>(`/provider-groups/${groupId}/services`, { method: 'POST', body: JSON.stringify(payload) }),
    updateProviderGroupService: (groupId: string, serviceId: string, payload: Partial<ProviderGroupService>) => request<{ item: ProviderGroupService }>(`/provider-groups/${groupId}/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteProviderGroupService: (groupId: string, serviceId: string) => request<Record<string, never>>(`/provider-groups/${groupId}/services/${serviceId}`, { method: 'DELETE' }),
    providerGroupCuratedSongIds: (groupId: string, serviceId: string) => request<{ items: string[] }>(`/provider-groups/${groupId}/services/${serviceId}/curated-songs`),
    searchSongCatalog: (q?: string, limit = 20) => {
        const params = new URLSearchParams();
        if (q?.trim()) params.set('q', q.trim());
        params.set('limit', String(limit));
        const query = params.toString();
        return request<{ items: CatalogSong[] }>(`/song-catalog${query ? `?${query}` : ''}`);
    },
    createCatalogSong: (payload: { title: string; artist?: string | null; tags?: string[] }) =>
        request<{ item: CatalogSong; created?: boolean }>('/song-catalog', { method: 'POST', body: JSON.stringify(payload) }),
    providerGroupRepertoire: (groupId: string) => request<{ items: RepertoireSong[] }>(`/provider-groups/${groupId}/repertoire`),
    bulkAddRepertoireSongs: (groupId: string, catalogSongIds: string[]) =>
        request<{ items: RepertoireSong[]; added: RepertoireSong[]; skipped: number }>(
            `/provider-groups/${groupId}/repertoire/bulk`,
            { method: 'POST', body: JSON.stringify({ catalogSongIds }) },
        ),
    createRepertoireSong: (groupId: string, payload: { catalogSongId?: string; title?: string; artist?: string | null; tags?: string[]; notes?: string | null }) =>
        request<{ item: RepertoireSong }>(`/provider-groups/${groupId}/repertoire`, { method: 'POST', body: JSON.stringify(payload) }),
    updateRepertoireSong: (groupId: string, songId: string, payload: Partial<RepertoireSong>) =>
        request<{ item: RepertoireSong }>(`/provider-groups/${groupId}/repertoire/${songId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteRepertoireSong: (groupId: string, songId: string) =>
        request<Record<string, never>>(`/provider-groups/${groupId}/repertoire/${songId}`, { method: 'DELETE' }),
    repertoireSongScores: (groupId: string, songId: string) =>
        request<{ items: SongScore[] }>(`/provider-groups/${groupId}/repertoire/${songId}/scores`),
    saveRepertoireSongScore: (groupId: string, songId: string, instrument: string, payload: { storageUrl: string; originalFilename?: string | null }) =>
        request<{ item: SongScore }>(`/provider-groups/${groupId}/repertoire/${songId}/scores/${encodeURIComponent(instrument)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    marketplaceGroupRepertoire: (slug: string, filters?: { tag?: string; q?: string }) => {
        const params = new URLSearchParams();
        if (filters?.tag) params.set('tag', filters.tag);
        if (filters?.q) params.set('q', filters.q);
        const query = params.toString();
        return request<{ tags: string[]; items: RepertoireSong[] }>(
            `/marketplace/groups/${encodeURIComponent(slug)}/repertoire${query ? `?${query}` : ''}`,
        );
    },
    marketplaceServiceRepertoire: (groupId: string, serviceId: string) =>
        request<{ songsIncluded: number; tags: string[]; items: RepertoireSong[] }>(
            `/marketplace/groups/${groupId}/services/${serviceId}/repertoire`,
        ),
    serenataSongs: (serenataId: string) =>
        request<{
            setlistStatus: Serenata['setlistStatus'];
            songsIncludedAtBooking: number | null;
            setlistConfirmedAt: string | null;
            items: SerenataSongSelection[];
        }>(`/serenatas/${serenataId}/songs`),
    confirmSerenataSetlist: (serenataId: string, songs: Array<{ repertoireSongId: string; sortOrder?: number }>) =>
        request<{ items: SerenataSongSelection[] }>(`/serenatas/${serenataId}/setlist/confirm`, { method: 'POST', body: JSON.stringify({ songs }) }),
    serenataSongScore: (serenataId: string, songId: string, instrument: string) =>
        request<{ item: SongScore }>(`/serenatas/${serenataId}/repertoire/${songId}/score?instrument=${encodeURIComponent(instrument)}`),
    uploadDocument: async (file: File): Promise<{ ok: boolean; url?: string; error?: string }> => {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('fileType', 'document');
        const response = await fetch(`${API_BASE}/api/media/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await response.json().catch(() => null) as { ok?: boolean; result?: { publicUrl?: string }; error?: string } | null;
        if (!response.ok || !data?.ok || !data.result?.publicUrl) {
            return { ok: false, error: data?.error ?? 'No pudimos subir el archivo.' };
        }
        return { ok: true, url: data.result.publicUrl };
    },
    providerGroupMembers: (groupId: string) => request<{ items: ProviderGroupMember[] }>(`/provider-groups/${groupId}/members`),
    inviteProviderGroupMember: (groupId: string, payload: { musicianId: string; role?: ProviderGroupMember['role']; instruments?: string[]; message?: string | null }) => request<{ member: ProviderGroupMember }>(`/provider-groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
    providerGroupMemberInvites: (groupId: string) => request<{ items: ProviderGroupMemberInvite[] }>(`/provider-groups/${groupId}/member-invites`),
    inviteProviderGroupExternalMember: (
        groupId: string,
        payload: {
            email?: string | null;
            phone?: string | null;
            displayName?: string | null;
            message?: string | null;
        },
    ) => request<{
        invite: ProviderGroupMemberInvite;
        emailSent?: boolean;
        signupUrl?: string;
        whatsappUrl?: string;
    }>(`/provider-groups/${groupId}/member-invites`, { method: 'POST', body: JSON.stringify(payload) }),
    cancelProviderGroupMemberInvite: (groupId: string, inviteId: string) => request<Record<string, never>>(
        `/provider-groups/${groupId}/member-invites/${inviteId}`,
        { method: 'DELETE' },
    ),
    updateProviderGroupMember: (groupId: string, memberId: string, payload: Partial<ProviderGroupMember>) => request<{ member: ProviderGroupMember }>(`/provider-groups/${groupId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    providerGroupRequests: (groupId: string) => request<{ items: Serenata[] }>(`/provider-groups/${groupId}/requests`),
    updateSerenata: (id: string, payload: Partial<Serenata> & {
        songSelections?: Array<{ repertoireSongId: string; clientNote?: string | null }>;
    }) => request<{ item: Serenata }>(`/serenatas/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    assignSerenataGroup: (id: string, payload: { mode: 'existing' | 'new'; groupId?: string | null; name?: string | null; musicianIds: string[]; message?: string | null }) => request<{ item: Serenata; group: SerenataGroup }>(`/serenatas/${id}/assign-group`, { method: 'POST', body: JSON.stringify(payload) }),
    updateSerenataStatus: (id: string, action: 'cancel' | 'complete', body?: { cancelReason?: string }) => request<{ item: Serenata }>(
        `/serenatas/${id}/${action}`,
        { method: 'POST', body: body ? JSON.stringify(body) : undefined },
    ),
    markOwnerPayout: (
        id: string,
        payload: { status: 'pending' | 'paid'; amount?: number | null; reference?: string | null },
    ) => request<{ item: Serenata }>(`/serenatas/${id}/owner-payout`, { method: 'POST', body: JSON.stringify(payload) }),
    confirmClientSerenata: (id: string, payload?: { rating?: number; comment?: string | null }) => request<{ item: Serenata }>(`/serenatas/${id}/client-confirm`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
    }),
    acceptSerenataOffer: (id: string) => request<{ item: Serenata }>(`/serenatas/${id}/accept-offer`, { method: 'POST' }),
    rejectSerenataOffer: (id: string, payload?: { reason?: string }) => request<{ offer: { id: string; status: string }; item?: Serenata }>(
        `/serenatas/${id}/reject-offer`,
        { method: 'POST', body: JSON.stringify(payload ?? {}) },
    ),
    groups: (providerGroupId?: string) => {
        const query = providerGroupId ? `?providerGroupId=${encodeURIComponent(providerGroupId)}` : '';
        return request<{ items: SerenataGroup[] }>(`/groups${query}`);
    },
    createGroup: (payload: {
        name: string;
        status?: SerenataGroup['status'];
        providerGroupId?: string;
        date?: string;
        maxMusicians?: number | null;
        requiredInstruments?: string[];
    }) => request<{ item: SerenataGroup }>('/groups', { method: 'POST', body: JSON.stringify(payload) }),
    updateGroup: (id: string, payload: {
        name?: string;
        status?: SerenataGroup['status'];
        requiredInstruments?: string[];
    }) => request<{ item: SerenataGroup }>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteGroup: (id: string) => request<Record<string, never>>(`/groups/${id}`, { method: 'DELETE' }),
    inviteToGroup: (
        groupId: string,
        payload:
            | { mode: 'email'; email: string }
            | { mode: 'whatsapp'; phone: string }
            | { mode: 'app'; musicianId: string; slotIndex?: number; instrument?: string | null }
    ) => request<{
        mode: GroupInviteMode;
        invite?: SerenataGroupPendingInvite;
        emailSent?: boolean;
        signupUrl?: string;
        whatsappUrl?: string;
        member?: SerenataGroupMember;
    }>(`/groups/${groupId}/invites`, { method: 'POST', body: JSON.stringify(payload) }),
    cancelGroupInvite: (groupId: string, inviteId: string) => request<Record<string, never>>(`/groups/${groupId}/invites/${inviteId}`, { method: 'DELETE' }),
    claimGroupInvite: (token: string) => request<{ member: SerenataGroupMember | ProviderGroupMember; groupId?: string; providerGroupId?: string }>('/group-invites/claim', { method: 'POST', body: JSON.stringify({ token }) }),
    inviteMember: (groupId: string, payload: { musicianId: string; instrument?: string | null; slotIndex?: number; message?: string | null }) => request<{ member: SerenataGroupMember }>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) }),
    updateGroupMember: (groupId: string, memberId: string, payload: Partial<Pick<SerenataGroupMember, 'status' | 'message' | 'instrument' | 'slotIndex'>>) => request<{ member: SerenataGroupMember }>(`/groups/${groupId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    invitations: () => request<{ items: Invitation[] }>('/invitations'),
    respondInvitation: (id: string, status: 'accepted' | 'rejected') => request<{ member: SerenataGroupMember | ProviderGroupMember }>(`/invitations/${id}/respond`, { method: 'POST', body: JSON.stringify({ status }) }),
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
    cancelEmailChange: async (): Promise<ApiEnvelope<object>> => {
        const response = await apiFetch<ApiEnvelope<object>>('/api/accounts/cancel-email-change', {
            method: 'POST',
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
    googleCalendarStatus: async (): Promise<{ connected: boolean; calendarId: string | null }> => {
        const response = await apiFetch<{ ok: boolean; connected: boolean; calendarId: string | null }>(
            '/api/serenatas/google-calendar/status',
        );
        const data = response.data;
        return {
            connected: Boolean(data?.connected),
            calendarId: data?.calendarId ?? null,
        };
    },
    googleCalendarAuthUrl: () => `${API_BASE}/api/serenatas/google-calendar/auth`,
    disconnectGoogleCalendar: async (): Promise<{ ok: boolean }> => {
        const response = await apiFetch<{ ok: boolean }>('/api/serenatas/google-calendar/disconnect', {
            method: 'DELETE',
        });
        return { ok: Boolean(response.data?.ok) };
    },
    changePassword: async (payload: {
        currentPassword?: string;
        newPassword: string;
        confirmPassword: string;
    }): Promise<ApiEnvelope<{ user?: SerenatasUser }>> => {
        const response = await apiFetch<ApiEnvelope<{ user?: SerenatasUser }>>('/api/auth/password/change', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!response.data) return { ok: false, error: 'No pudimos conectar con el servidor.' };
        return response.data;
    },
};
