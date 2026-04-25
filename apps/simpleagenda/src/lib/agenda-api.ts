import { API_BASE } from '@simple/config';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as T;
    return data;
}

export type AgendaPlanId = 'free' | 'pro' | 'enterprise';

export function isPlanActive(profile: { plan: string; planExpiresAt: string | null }, minPlan: AgendaPlanId = 'pro'): boolean {
    const RANK: Record<AgendaPlanId, number> = { free: 0, pro: 1, enterprise: 2 };
    const planId = profile.plan as AgendaPlanId;
    if ((RANK[planId] ?? 0) < (RANK[minPlan] ?? 1)) return false;
    if ((planId === 'pro' || planId === 'enterprise') && profile.planExpiresAt && new Date(profile.planExpiresAt) < new Date()) return false;
    return true;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export type BankTransferData = {
    bank: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
    holderEmail: string;
    alias?: string;
};

export type AgendaProfile = {
    id: string;
    userId: string;
    slug: string;
    isPublished: boolean;
    plan: string;
    planExpiresAt: string | null;
    acceptsTransfer: boolean;
    acceptsMp: boolean;
    acceptsPaymentLink: boolean;
    profession: string | null;
    displayName: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    city: string | null;
    region: string | null;
    address: string | null;
    currency: string;
    timezone: string;
    bookingWindowDays: number;
    cancellationHours: number;
    confirmationMode: string;
    allowsRecurrentBooking: boolean;
    encuadre: string | null;
    requiresAdvancePayment: boolean;
    advancePaymentInstructions: string | null;
    googleCalendarId: string | null;
    googleAccessToken: string | null;
    waNotificationsEnabled: boolean;
    waNotifyProfessional: boolean;
    waProfessionalPhone: string | null;
    mpAccessToken: string | null;
    mpPublicKey: string | null;
    mpUserId: string | null;
    paymentLinkUrl: string | null;
    bankTransferData: BankTransferData | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    linkedinUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    twitterUrl: string | null;
    createdAt: string;
    updatedAt: string;
};

export async function fetchAgendaProfile(): Promise<AgendaProfile | null> {
    try {
        const data = await apiFetch<{ ok: boolean; profile: AgendaProfile | null }>('/api/agenda/profile');
        return data.profile;
    } catch (err) {
        if (err instanceof Error && /no encontrado|not found|404/i.test(err.message)) {
            return null;
        }
        throw err;
    }
}

export async function saveAgendaProfile(body: Partial<AgendaProfile>): Promise<{ ok: boolean; profile?: AgendaProfile; error?: string }> {
    return apiFetch('/api/agenda/profile', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function checkSlugAvailable(slug: string): Promise<{ available: boolean; error?: string }> {
    const data = await apiFetch<{ ok: boolean; available: boolean; error?: string }>(`/api/agenda/slug-available?slug=${encodeURIComponent(slug)}`);
    return { available: data.available, error: data.error };
}

export async function uploadAvatar(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', 'image');
    const res = await fetch(`${API_BASE}/api/media/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });
    const data = await res.json() as { ok: boolean; result?: { publicUrl: string }; error?: string };
    if (!data.ok) return { ok: false, error: data.error ?? 'Error al subir imagen' };
    return { ok: true, url: data.result?.publicUrl };
}

// ── Services ─────────────────────────────────────────────────────────────────

export type PreconsultFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
export type PreconsultField = {
    id: string;
    label: string;
    type: PreconsultFieldType;
    required: boolean;
    placeholder?: string;
    options?: string[];
};

export type AgendaService = {
    id: string;
    professionalId: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: string | null;
    currency: string;
    isOnline: boolean;
    isPresential: boolean;
    color: string | null;
    isActive: boolean;
    position: number;
    preconsultFields?: PreconsultField[];
};

export type PreconsultResponse = { label: string; value: string };

export async function fetchAgendaServices(): Promise<AgendaService[]> {
    const data = await apiFetch<{ ok: boolean; services: AgendaService[] }>('/api/agenda/services');
    return data.services ?? [];
}

export async function createAgendaService(body: Partial<AgendaService>): Promise<{ ok: boolean; service?: AgendaService; error?: string }> {
    return apiFetch('/api/agenda/services', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAgendaService(id: string, body: Partial<AgendaService>): Promise<{ ok: boolean; service?: AgendaService; error?: string }> {
    return apiFetch(`/api/agenda/services/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteAgendaService(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/agenda/services/${id}`, { method: 'DELETE' });
}

// ── Availability ─────────────────────────────────────────────────────────────

export type AvailabilityRule = {
    id: string;
    professionalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    isActive: boolean;
};

export type BlockedSlot = {
    id: string;
    professionalId: string;
    startsAt: string;
    endsAt: string;
    reason: string | null;
};

export async function fetchAgendaAvailability(): Promise<{ rules: AvailabilityRule[]; blockedSlots: BlockedSlot[] }> {
    const data = await apiFetch<{ ok: boolean; rules: AvailabilityRule[]; blockedSlots: BlockedSlot[] }>('/api/agenda/availability');
    return { rules: data.rules ?? [], blockedSlots: data.blockedSlots ?? [] };
}

export async function createAvailabilityRule(body: Partial<AvailabilityRule>): Promise<{ ok: boolean; rule?: AvailabilityRule; error?: string }> {
    return apiFetch('/api/agenda/availability/rules', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAvailabilityRule(id: string, body: Partial<AvailabilityRule>): Promise<{ ok: boolean; rule?: AvailabilityRule; error?: string }> {
    return apiFetch(`/api/agenda/availability/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteAvailabilityRule(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/agenda/availability/rules/${id}`, { method: 'DELETE' });
}

export async function createBlockedSlot(body: { startsAt: string; endsAt: string; reason?: string }): Promise<{ ok: boolean; slot?: BlockedSlot; error?: string }> {
    return apiFetch('/api/agenda/availability/blocked-slots', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteBlockedSlot(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/agenda/availability/blocked-slots/${id}`, { method: 'DELETE' });
}

// ── Locations (consulting rooms) ──────────────────────────────────────────────

export type AgendaLocation = {
    id: string;
    professionalId: string;
    name: string;
    addressLine: string;
    city: string | null;
    region: string | null;
    notes: string | null;
    googleMapsUrl: string | null;
    isDefault: boolean;
    isActive: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export async function fetchAgendaLocations(): Promise<AgendaLocation[]> {
    const data = await apiFetch<{ ok: boolean; locations: AgendaLocation[] }>('/api/agenda/locations');
    return data.locations ?? [];
}

export async function createAgendaLocation(body: Partial<AgendaLocation>): Promise<{ ok: boolean; location?: AgendaLocation; error?: string }> {
    return apiFetch('/api/agenda/locations', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAgendaLocation(id: string, body: Partial<AgendaLocation>): Promise<{ ok: boolean; location?: AgendaLocation; error?: string }> {
    return apiFetch(`/api/agenda/locations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteAgendaLocation(id: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/agenda/locations/${id}`, { method: 'DELETE' });
}

// ── Clients ───────────────────────────────────────────────────────────────────

export type ClientTag = {
    id: string;
    name: string;
    color: string | null;
};

export type AgendaClient = {
    id: string;
    professionalId: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    rut: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    occupation: string | null;
    address: string | null;
    city: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    referredBy: string | null;
    internalNotes: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    // Populated by list endpoint (IDs only) and detail endpoint (full tag objects).
    tagIds?: string[];
    tags?: ClientTag[];
};

export async function fetchAgendaClients(): Promise<AgendaClient[]> {
    const data = await apiFetch<{ ok: boolean; clients: AgendaClient[] }>('/api/agenda/clients');
    return data.clients ?? [];
}

export async function createAgendaClient(body: Partial<AgendaClient>): Promise<{ ok: boolean; client?: AgendaClient; error?: string }> {
    return apiFetch('/api/agenda/clients', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchAgendaClient(id: string): Promise<{ client: AgendaClient; appointments: AgendaAppointment[] } | null> {
    const data = await apiFetch<{ ok: boolean; client?: AgendaClient; appointments?: AgendaAppointment[] }>(`/api/agenda/clients/${id}`);
    if (!data.ok || !data.client) return null;
    return { client: data.client, appointments: data.appointments ?? [] };
}

// ── Client tags ───────────────────────────────────────────────────────────────

export type AgendaClientTag = {
    id: string;
    professionalId: string;
    name: string;
    color: string | null;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export async function fetchClientTags(): Promise<AgendaClientTag[]> {
    try {
        const res = await apiFetch<{ ok: boolean; tags: AgendaClientTag[] }>('/api/agenda/client-tags');
        return res.ok ? (res.tags ?? []) : [];
    } catch {
        return [];
    }
}

export async function createClientTag(body: { name: string; color?: string | null }): Promise<{ ok: boolean; tag?: AgendaClientTag; error?: string }> {
    return apiFetch('/api/agenda/client-tags', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateClientTag(id: string, body: { name?: string; color?: string | null; position?: number }): Promise<{ ok: boolean; tag?: AgendaClientTag; error?: string }> {
    return apiFetch(`/api/agenda/client-tags/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteClientTag(id: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/client-tags/${id}`, { method: 'DELETE' });
}

export async function assignTagToClient(clientId: string, tagId: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/clients/${clientId}/tags`, { method: 'POST', body: JSON.stringify({ tagId }) });
}

export async function unassignTagFromClient(clientId: string, tagId: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/clients/${clientId}/tags/${tagId}`, { method: 'DELETE' });
}

export async function updateAgendaClient(id: string, body: Partial<AgendaClient>): Promise<{ ok: boolean; client?: AgendaClient; error?: string }> {
    return apiFetch(`/api/agenda/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteAgendaClient(id: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/clients/${id}`, { method: 'DELETE' });
}

// ── Client attachments ────────────────────────────────────────────────────────

export type AttachmentKind = 'document' | 'image' | 'prescription' | 'other';

export type ClientAttachment = {
    id: string;
    professionalId: string;
    clientId: string;
    name: string;
    url: string;
    mimeType: string | null;
    sizeBytes: number | null;
    kind: AttachmentKind;
    uploadedAt: string;
};

export async function uploadClientFile(file: File, fileType: 'image' | 'document'): Promise<{ ok: boolean; url?: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    const res = await fetch(`${API_BASE}/api/media/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });
    const data = await res.json() as { ok: boolean; result?: { publicUrl: string }; error?: string };
    if (!data.ok) return { ok: false, error: data.error ?? 'Error al subir el archivo' };
    return { ok: true, url: data.result?.publicUrl };
}

export async function fetchClientAttachments(clientId: string): Promise<ClientAttachment[]> {
    const data = await apiFetch<{ ok: boolean; attachments: ClientAttachment[] }>(`/api/agenda/clients/${clientId}/attachments`);
    return data.attachments ?? [];
}

export async function createClientAttachment(
    clientId: string,
    body: { name: string; url: string; mimeType?: string | null; sizeBytes?: number | null; kind: AttachmentKind },
): Promise<{ ok: boolean; attachment?: ClientAttachment; error?: string }> {
    return apiFetch(`/api/agenda/clients/${clientId}/attachments`, { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteClientAttachment(clientId: string, attachmentId: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/clients/${clientId}/attachments/${attachmentId}`, { method: 'DELETE' });
}

// ── Appointments ──────────────────────────────────────────────────────────────

export type AgendaAppointment = {
    id: string;
    professionalId: string;
    serviceId: string | null;
    clientId: string | null;
    clientName: string | null;
    clientEmail: string | null;
    clientPhone: string | null;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    modality: string;
    meetingUrl: string | null;
    location: string | null;
    status: string;
    price: string | null;
    currency: string;
    internalNotes: string | null;
    clientNotes: string | null;
    cancelledAt: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
    seriesId: string | null;
    recurrenceFrequency: string | null;
    clientPackId: string | null;
    createdAt: string;
    updatedAt: string;
    sessionNote?: string | null;
    service?: AgendaService;
    client?: AgendaClient;
    preconsultResponses?: PreconsultResponse[] | null;
};

export async function fetchAgendaAppointments(from?: string, to?: string): Promise<AgendaAppointment[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await apiFetch<{ ok: boolean; appointments: AgendaAppointment[] }>(`/api/agenda/appointments${qs}`);
    return data.appointments ?? [];
}

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export async function createAgendaAppointment(body: Partial<AgendaAppointment> & {
    repeatWeekly?: number;
    recurrenceFrequency?: RecurrenceFrequency;
    recurrenceCount?: number;
}): Promise<{ ok: boolean; appointment?: AgendaAppointment; appointments?: AgendaAppointment[]; error?: string }> {
    return apiFetch('/api/agenda/appointments', { method: 'POST', body: JSON.stringify(body) });
}

export async function patchAppointmentStatus(id: string, status: string, cancellationReason?: string): Promise<{ ok: boolean; appointment?: AgendaAppointment; error?: string }> {
    return apiFetch(`/api/agenda/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancellationReason }),
    });
}

export async function cancelAppointmentSeries(id: string, scope: 'future' | 'all', cancellationReason?: string): Promise<{ ok: boolean; count?: number; error?: string }> {
    return apiFetch(`/api/agenda/appointments/${id}/cancel-series`, {
        method: 'POST',
        body: JSON.stringify({ scope, cancellationReason }),
    });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export type AgendaPayment = {
    id: string;
    professionalId: string;
    appointmentId: string | null;
    clientId: string | null;
    amount: string;
    currency: string;
    method: string | null;
    status: string;
    paidAt: string | null;
    notes: string | null;
    createdAt: string;
};

export async function fetchAgendaPayments(): Promise<AgendaPayment[]> {
    const data = await apiFetch<{ ok: boolean; payments: AgendaPayment[] }>('/api/agenda/payments');
    return data.payments ?? [];
}

export async function createAgendaPayment(body: Partial<AgendaPayment>): Promise<{ ok: boolean; payment?: AgendaPayment; error?: string }> {
    return apiFetch('/api/agenda/payments', { method: 'POST', body: JSON.stringify(body) });
}

export async function patchAgendaPayment(id: string, body: Partial<AgendaPayment>): Promise<{ ok: boolean; payment?: AgendaPayment; error?: string }> {
    return apiFetch(`/api/agenda/payments/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteAgendaPayment(id: string): Promise<{ ok: boolean; error?: string }> {
    return apiFetch(`/api/agenda/payments/${id}`, { method: 'DELETE' });
}

// ── Session notes ─────────────────────────────────────────────────────────────

export type AgendaSessionNote = {
    id: string;
    appointmentId: string;
    professionalId: string;
    clientId: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
};

export async function fetchAgendaNote(appointmentId: string): Promise<AgendaSessionNote | null> {
    const data = await apiFetch<{ ok: boolean; note: AgendaSessionNote | null }>(`/api/agenda/notes/${appointmentId}`);
    return data.note;
}

export async function saveAgendaNote(appointmentId: string, content: string): Promise<{ ok: boolean; note?: AgendaSessionNote; error?: string }> {
    return apiFetch('/api/agenda/notes', { method: 'POST', body: JSON.stringify({ appointmentId, content }) });
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export type AgendaWeekDay = {
    label: string;   // 'L', 'M', 'X', 'J', 'V', 'S', 'D'
    date: string;    // 'YYYY-MM-DD'
    count: number;
    isToday: boolean;
};

export type AgendaStats = {
    todayCount: number;
    activeClients: number;
    pendingPayments: number;
    nextAppointment: AgendaAppointment | null;
    weeklyData: AgendaWeekDay[];
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    thisMonthAppointments: number;
    hasServices: boolean;
    hasRules: boolean;
    hasLocations: boolean;
};

export async function cancelPublicAppointment(appointmentId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/api/public/agenda/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason ?? '' }),
    });
    return res.json() as Promise<{ ok: boolean; error?: string }>;
}


const EMPTY_STATS: AgendaStats = {
    todayCount: 0,
    activeClients: 0,
    pendingPayments: 0,
    nextAppointment: null,
    weeklyData: [],
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    thisMonthAppointments: 0,
    hasServices: false,
    hasRules: false,
    hasLocations: false,
};

export async function fetchAgendaStats(): Promise<AgendaStats> {
    try {
        const data = await apiFetch<{ ok: boolean; stats: AgendaStats }>('/api/agenda/stats');
        return data.stats ?? EMPTY_STATS;
    } catch {
        return EMPTY_STATS;
    }
}

// ── Update appointment ────────────────────────────────────────────────────────

export async function updateAgendaAppointment(id: string, body: Partial<AgendaAppointment>): Promise<{ ok: boolean; appointment?: AgendaAppointment; error?: string }> {
    return apiFetch(`/api/agenda/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

// ── Google Calendar ───────────────────────────────────────────────────────────

export async function fetchGoogleCalendarStatus(): Promise<{ connected: boolean; calendarId: string | null }> {
    const data = await apiFetch<{ ok: boolean; connected: boolean; calendarId: string | null }>('/api/agenda/google-calendar/status');
    return { connected: data.connected ?? false, calendarId: data.calendarId ?? null };
}

export function getGoogleCalendarAuthUrl(): string {
    return `${API_BASE}/api/agenda/google-calendar/auth`;
}

export async function disconnectGoogleCalendar(): Promise<{ ok: boolean }> {
    return apiFetch('/api/agenda/google-calendar/disconnect', { method: 'DELETE' });
}

export async function sendWhatsAppTest(): Promise<{ ok: boolean; error?: string }> {
    return apiFetch('/api/agenda/whatsapp/test', { method: 'POST' });
}

export type NotificationEvent = {
    id: string;
    channel: 'email' | 'whatsapp' | 'push' | 'sms';
    eventType: 'confirmation' | 'reminder_24h' | 'reminder_30min' | 'cancellation' | 'test' | 'professional_new_booking' | 'reschedule';
    recipient: string | null;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage: string | null;
    createdAt: string;
};

export async function fetchNotificationHistory(limit = 20): Promise<NotificationEvent[]> {
    try {
        const res = await apiFetch<{ ok: boolean; events: NotificationEvent[] }>(
            `/api/agenda/notifications/history?limit=${limit}`,
        );
        return res.ok ? (res.events ?? []) : [];
    } catch {
        return [];
    }
}

// ── MercadoPago OAuth ─────────────────────────────────────────────────────────

export type PaymentMethods = {
    requiresAdvancePayment: boolean;
    mpConnected: boolean;
    paymentLinkUrl: string | null;
    bankTransferData: BankTransferData | null;
};

export async function fetchMercadoPagoStatus(): Promise<{ connected: boolean; userId: string | null }> {
    const data = await apiFetch<{ ok: boolean; connected: boolean; userId: string | null }>('/api/agenda/mercadopago/status');
    return { connected: data.connected ?? false, userId: data.userId ?? null };
}

export function getMercadoPagoAuthUrl(): string {
    return `${API_BASE}/api/agenda/mercadopago/auth`;
}

export async function disconnectMercadoPago(): Promise<{ ok: boolean }> {
    return apiFetch('/api/agenda/mercadopago/disconnect', { method: 'DELETE' });
}

// ── Public booking slots ──────────────────────────────────────────────────────

export type TimeSlot = { startsAt: string; endsAt: string };

export async function fetchPublicSlots(slug: string, date: string, serviceId?: string): Promise<TimeSlot[]> {
    const params = new URLSearchParams({ date });
    if (serviceId) params.set('serviceId', serviceId);
    const res = await fetch(`${API_BASE}/api/public/agenda/${slug}/slots?${params.toString()}`);
    const data = await res.json() as { ok: boolean; slots: TimeSlot[] };
    return data.slots ?? [];
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type AgendaNotification = {
    id: string;
    type: 'new_booking' | 'cancellation' | 'today' | string;
    title: string;
    body: string;
    createdAt: number;
};

export async function fetchNotifications(): Promise<{ items: AgendaNotification[]; lastSeenAt: number | null }> {
    const data = await apiFetch<{ ok: boolean; items?: AgendaNotification[]; lastSeenAt?: number | null }>('/api/agenda/notifications');
    return { items: data.items ?? [], lastSeenAt: data.lastSeenAt ?? null };
}

export async function markNotificationsSeen(): Promise<void> {
    await apiFetch('/api/agenda/notifications/seen', { method: 'POST' });
}

// ── Public booking ────────────────────────────────────────────────────────────

export async function bookAppointment(slug: string, body: {
    serviceId?: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientNotes?: string;
    startsAt: string;
    modality?: string;
    policyAgreed?: boolean;
    recurrenceFrequency?: RecurrenceFrequency;
    recurrenceCount?: number;
    preconsultResponses?: Record<string, string | boolean>;
    promotionCode?: string;
}): Promise<{ ok: boolean; appointment?: { id: string; status: string; startsAt: string; paymentStatus: string; modality?: string | null; meetingUrl?: string | null }; appointments?: Array<{ id: string; startsAt: string }>; seriesId?: string | null; checkoutUrl?: string | null; paymentMethods?: PaymentMethods; error?: string }> {
    const res = await fetch(`${API_BASE}/api/public/agenda/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json() as Promise<{ ok: boolean; appointment?: { id: string; status: string; startsAt: string; paymentStatus: string; modality?: string | null; meetingUrl?: string | null }; appointments?: Array<{ id: string; startsAt: string }>; seriesId?: string | null; checkoutUrl?: string | null; paymentMethods?: PaymentMethods; error?: string }>;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsData = {
    monthly: Array<{ month: string; label: string; revenue: number }>;
    byService: Array<{ serviceId: string | null; serviceName: string; count: number; revenue: number }>;
    topClients: Array<{ clientId: string | null; clientName: string; count: number }>;
    noShowRate: number;
    totalCompleted: number;
    totalCancelled: number;
    totalNoShow: number;
    nps: { avg: number | null; promoters: number; passives: number; detractors: number; count: number; score: number | null };
};

export async function fetchAgendaAnalytics(): Promise<AnalyticsData | null> {
    try {
        const data = await apiFetch<{ ok: boolean; analytics: AnalyticsData }>('/api/agenda/analytics');
        return data.analytics ?? null;
    } catch { return null; }
}

// ── NPS ──────────────────────────────────────────────────────────────────────

export type NpsResponseRow = {
    id: string;
    score: number | null;
    comment: string | null;
    submittedAt: string | null;
    sentAt: string;
    appointmentId: string;
    clientName: string | null;
};

export async function fetchNpsResponses(): Promise<NpsResponseRow[]> {
    try {
        const data = await apiFetch<{ ok: boolean; responses: NpsResponseRow[] }>('/api/agenda/nps');
        return data.responses ?? [];
    } catch { return []; }
}

export async function createNpsTokenForAppointment(appointmentId: string): Promise<string | null> {
    try {
        const data = await apiFetch<{ ok: boolean; token: string | null }>('/api/agenda/nps/for-appointment', {
            method: 'POST', body: JSON.stringify({ appointmentId }),
        });
        return data.token ?? null;
    } catch { return null; }
}

export type PublicNpsContext = {
    alreadySubmitted: boolean;
    professional: { displayName: string; slug: string; avatarUrl: string | null } | null;
    appointment: { startsAt: string; clientName: string | null } | null;
    response: { score: number | null; comment: string | null } | null;
};

export async function fetchPublicNpsContext(token: string): Promise<PublicNpsContext | null> {
    try {
        const res = await fetch(`${API_BASE}/api/public/nps/${token}`);
        if (!res.ok) return null;
        const data = await res.json() as { ok: boolean } & PublicNpsContext;
        return data.ok ? data : null;
    } catch { return null; }
}

export async function submitPublicNps(token: string, score: number, comment?: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/api/public/nps/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment }),
    });
    return res.json() as Promise<{ ok: boolean; error?: string }>;
}

// ── Referidos ────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'converted' | 'rewarded' | 'cancelled';

export type AgendaReferral = {
    id: string;
    referrerClientId: string;
    refereeClientId: string | null;
    refereeName: string | null;
    refereePhone: string | null;
    status: ReferralStatus;
    rewardNote: string | null;
    createdAt: string;
    convertedAt: string | null;
    rewardedAt: string | null;
    referrerFirstName: string | null;
    referrerLastName: string | null;
};

export type ReferralStats = {
    total: number;
    pending: number;
    converted: number;
    rewarded: number;
};

export async function fetchAgendaReferrals(): Promise<{ referrals: AgendaReferral[]; stats: ReferralStats }> {
    try {
        const data = await apiFetch<{ ok: boolean; referrals: AgendaReferral[]; stats: ReferralStats }>('/api/agenda/referrals');
        return { referrals: data.referrals ?? [], stats: data.stats ?? { total: 0, pending: 0, converted: 0, rewarded: 0 } };
    } catch {
        return { referrals: [], stats: { total: 0, pending: 0, converted: 0, rewarded: 0 } };
    }
}

export async function createAgendaReferral(body: {
    referrerClientId: string;
    refereeName?: string;
    refereePhone?: string;
    refereeClientId?: string | null;
    rewardNote?: string;
}): Promise<{ ok: boolean; error?: string; referral?: AgendaReferral }> {
    try {
        return await apiFetch('/api/agenda/referrals', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchAgendaReferral(
    id: string,
    body: Partial<{ status: ReferralStatus; rewardNote: string; refereeClientId: string | null }>,
): Promise<{ ok: boolean; error?: string; referral?: AgendaReferral }> {
    try {
        return await apiFetch(`/api/agenda/referrals/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteAgendaReferral(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/referrals/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

// ── Promociones / cupones ────────────────────────────────────────────────────

export type PromotionDiscountType = 'percent' | 'fixed';
export type PromotionAppliesTo = 'all' | 'services';

export type AgendaPromotion = {
    id: string;
    code: string | null;
    label: string;
    description: string | null;
    discountType: PromotionDiscountType;
    discountValue: string; // decimal string
    appliesTo: PromotionAppliesTo;
    serviceIds: string[];
    minAmount: string | null;
    maxUses: number | null;
    usesCount: number;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type PromotionInput = {
    code?: string | null;
    label: string;
    description?: string | null;
    discountType: PromotionDiscountType;
    discountValue: number;
    appliesTo: PromotionAppliesTo;
    serviceIds?: string[];
    minAmount?: number | null;
    maxUses?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
};

export async function fetchAgendaPromotions(): Promise<AgendaPromotion[]> {
    try {
        const data = await apiFetch<{ ok: boolean; promotions: AgendaPromotion[] }>('/api/agenda/promotions');
        return data.promotions ?? [];
    } catch {
        return [];
    }
}

export async function createAgendaPromotion(body: PromotionInput): Promise<{ ok: boolean; error?: string; promotion?: AgendaPromotion }> {
    try {
        return await apiFetch('/api/agenda/promotions', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchAgendaPromotion(id: string, body: Partial<PromotionInput>): Promise<{ ok: boolean; error?: string; promotion?: AgendaPromotion }> {
    try {
        return await apiFetch(`/api/agenda/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteAgendaPromotion(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/promotions/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export type PromoValidationResult = {
    ok: boolean;
    error?: string;
    promotion?: {
        id: string;
        code: string | null;
        label: string;
        discountType: PromotionDiscountType;
        discountValue: string;
    };
    originalPrice?: number;
    discountAmount?: number;
    finalPrice?: number;
};

export async function validatePublicPromo(slug: string, params: {
    code: string;
    serviceId?: string | null;
    basePrice?: number | null;
}): Promise<PromoValidationResult> {
    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/${slug}/validate-promo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return await res.json() as PromoValidationResult;
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

// ── Packs / bonos ────────────────────────────────────────────────────────────

export type PackAppliesTo = 'all' | 'services';
export type ClientPackStatus = 'active' | 'expired' | 'completed' | 'refunded';

export type AgendaPack = {
    id: string;
    professionalId: string;
    name: string;
    description: string | null;
    sessionsCount: number;
    price: string;
    currency: string;
    serviceIds: string[];
    appliesTo: PackAppliesTo;
    validityDays: number | null;
    isActive: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export type PackInput = {
    name: string;
    description?: string | null;
    sessionsCount: number;
    price: number;
    currency?: string;
    serviceIds?: string[];
    appliesTo?: PackAppliesTo;
    validityDays?: number | null;
    isActive?: boolean;
    position?: number;
};

export type AgendaClientPack = {
    id: string;
    professionalId: string;
    packId: string | null;
    clientId: string;
    name: string;
    sessionsTotal: number;
    sessionsUsed: number;
    pricePaid: string | null;
    currency: string;
    serviceIds: string[];
    appliesTo: PackAppliesTo;
    purchasedAt: string;
    expiresAt: string | null;
    status: ClientPackStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ClientPackInput = {
    clientId: string;
    packId?: string | null;
    name?: string;
    sessionsTotal?: number;
    pricePaid?: number | null;
    currency?: string;
    serviceIds?: string[];
    appliesTo?: PackAppliesTo;
    expiresAt?: string | null;
    notes?: string | null;
};

export async function fetchAgendaPacks(): Promise<AgendaPack[]> {
    try {
        const data = await apiFetch<{ ok: boolean; packs: AgendaPack[] }>('/api/agenda/packs');
        return data.packs ?? [];
    } catch {
        return [];
    }
}

export async function createAgendaPack(body: PackInput): Promise<{ ok: boolean; error?: string; pack?: AgendaPack }> {
    try {
        return await apiFetch('/api/agenda/packs', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchAgendaPack(id: string, body: Partial<PackInput>): Promise<{ ok: boolean; error?: string; pack?: AgendaPack }> {
    try {
        return await apiFetch(`/api/agenda/packs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteAgendaPack(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/packs/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function fetchClientPacks(params?: { clientId?: string; status?: ClientPackStatus }): Promise<AgendaClientPack[]> {
    try {
        const qs = new URLSearchParams();
        if (params?.clientId) qs.set('clientId', params.clientId);
        if (params?.status) qs.set('status', params.status);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        const data = await apiFetch<{ ok: boolean; clientPacks: AgendaClientPack[] }>(`/api/agenda/client-packs${suffix}`);
        return data.clientPacks ?? [];
    } catch {
        return [];
    }
}

export async function createClientPack(body: ClientPackInput): Promise<{ ok: boolean; error?: string; clientPack?: AgendaClientPack }> {
    try {
        return await apiFetch('/api/agenda/client-packs', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchClientPack(id: string, body: Partial<ClientPackInput> & { status?: ClientPackStatus }): Promise<{ ok: boolean; error?: string; clientPack?: AgendaClientPack }> {
    try {
        return await apiFetch(`/api/agenda/client-packs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteClientPack(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/client-packs/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

// ── Sesiones grupales ─────────────────────────────────────────────────────────

export type GroupSessionModality = 'online' | 'presential';
export type GroupSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type GroupAttendeeStatus = 'registered' | 'attended' | 'no_show' | 'cancelled';

export type AgendaGroupSession = {
    id: string;
    professionalId: string;
    serviceId: string | null;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    capacity: number;
    price: string | null;
    currency: string;
    modality: GroupSessionModality;
    location: string | null;
    meetingUrl: string | null;
    status: GroupSessionStatus;
    isPublic: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    attendeeCount?: number;
};

export type AgendaGroupAttendee = {
    id: string;
    sessionId: string;
    professionalId: string;
    clientId: string | null;
    clientName: string;
    clientEmail: string | null;
    clientPhone: string | null;
    status: GroupAttendeeStatus;
    pricePaid: string | null;
    paidAt: string | null;
    notes: string | null;
    registeredAt: string;
    createdAt: string;
    updatedAt: string;
};

export type GroupSessionInput = {
    title: string;
    description?: string | null;
    serviceId?: string | null;
    startsAt: string;
    durationMinutes: number;
    capacity: number;
    price?: number | null;
    currency?: string;
    modality?: GroupSessionModality;
    location?: string | null;
    meetingUrl?: string | null;
    isPublic?: boolean;
    notes?: string | null;
    status?: GroupSessionStatus;
};

export type GroupAttendeeInput = {
    clientId?: string | null;
    clientName: string;
    clientEmail?: string | null;
    clientPhone?: string | null;
    pricePaid?: number | null;
    notes?: string | null;
};

export async function fetchGroupSessions(status?: GroupSessionStatus): Promise<AgendaGroupSession[]> {
    try {
        const qs = status ? `?status=${status}` : '';
        const data = await apiFetch<{ ok: boolean; sessions: AgendaGroupSession[] }>(`/api/agenda/group-sessions${qs}`);
        return data.sessions ?? [];
    } catch {
        return [];
    }
}

export async function fetchGroupSession(id: string): Promise<{ session: AgendaGroupSession; attendees: AgendaGroupAttendee[] } | null> {
    try {
        const data = await apiFetch<{ ok: boolean; session: AgendaGroupSession; attendees: AgendaGroupAttendee[] }>(`/api/agenda/group-sessions/${id}`);
        return { session: data.session, attendees: data.attendees ?? [] };
    } catch {
        return null;
    }
}

export async function createGroupSession(body: GroupSessionInput): Promise<{ ok: boolean; error?: string; session?: AgendaGroupSession }> {
    try {
        return await apiFetch('/api/agenda/group-sessions', { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchGroupSession(id: string, body: Partial<GroupSessionInput>): Promise<{ ok: boolean; error?: string; session?: AgendaGroupSession }> {
    try {
        return await apiFetch(`/api/agenda/group-sessions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteGroupSession(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/group-sessions/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function addGroupAttendee(sessionId: string, body: GroupAttendeeInput): Promise<{ ok: boolean; error?: string; attendee?: AgendaGroupAttendee }> {
    try {
        return await apiFetch(`/api/agenda/group-sessions/${sessionId}/attendees`, { method: 'POST', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function patchGroupAttendee(id: string, body: Partial<GroupAttendeeInput> & { status?: GroupAttendeeStatus }): Promise<{ ok: boolean; error?: string; attendee?: AgendaGroupAttendee }> {
    try {
        return await apiFetch(`/api/agenda/group-attendees/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}

export async function deleteGroupAttendee(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
        return await apiFetch(`/api/agenda/group-attendees/${id}`, { method: 'DELETE' });
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
}
