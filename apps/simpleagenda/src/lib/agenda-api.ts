const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    const data = await res.json() as T;
    return data;
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
    profession: string | null;
    displayName: string | null;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
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
    createdAt: string;
    updatedAt: string;
};

export async function fetchAgendaProfile(): Promise<AgendaProfile | null> {
    const data = await apiFetch<{ ok: boolean; profile: AgendaProfile | null }>('/api/agenda/profile');
    return data.profile;
}

export async function saveAgendaProfile(body: Partial<AgendaProfile>): Promise<{ ok: boolean; profile?: AgendaProfile; error?: string }> {
    return apiFetch('/api/agenda/profile', { method: 'PATCH', body: JSON.stringify(body) });
}

// ── Services ─────────────────────────────────────────────────────────────────

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
};

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

// ── Clients ───────────────────────────────────────────────────────────────────

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

export async function updateAgendaClient(id: string, body: Partial<AgendaClient>): Promise<{ ok: boolean; client?: AgendaClient; error?: string }> {
    return apiFetch(`/api/agenda/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) });
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
    createdAt: string;
    updatedAt: string;
    service?: AgendaService;
    client?: AgendaClient;
};

export async function fetchAgendaAppointments(from?: string, to?: string): Promise<AgendaAppointment[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await apiFetch<{ ok: boolean; appointments: AgendaAppointment[] }>(`/api/agenda/appointments${qs}`);
    return data.appointments ?? [];
}

export async function createAgendaAppointment(body: Partial<AgendaAppointment> & { repeatWeekly?: number }): Promise<{ ok: boolean; appointment?: AgendaAppointment; appointments?: AgendaAppointment[]; error?: string }> {
    return apiFetch('/api/agenda/appointments', { method: 'POST', body: JSON.stringify(body) });
}

export async function patchAppointmentStatus(id: string, status: string, cancellationReason?: string): Promise<{ ok: boolean; appointment?: AgendaAppointment; error?: string }> {
    return apiFetch(`/api/agenda/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancellationReason }),
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
};

export async function cancelPublicAppointment(appointmentId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/api/public/agenda/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason ?? '' }),
    });
    return res.json() as Promise<{ ok: boolean; error?: string }>;
}


export async function fetchAgendaStats(): Promise<AgendaStats> {
    const data = await apiFetch<{ ok: boolean; stats: AgendaStats }>('/api/agenda/stats');
    return data.stats ?? { todayCount: 0, activeClients: 0, pendingPayments: 0, nextAppointment: null, weeklyData: [], thisMonthRevenue: 0, lastMonthRevenue: 0, thisMonthAppointments: 0 };
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

export async function fetchNotifications(): Promise<AgendaNotification[]> {
    const data = await apiFetch<{ ok: boolean; items?: AgendaNotification[] }>('/api/agenda/notifications');
    return data.items ?? [];
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
}): Promise<{ ok: boolean; appointment?: { id: string; status: string; startsAt: string; paymentStatus: string }; checkoutUrl?: string | null; paymentMethods?: PaymentMethods; error?: string }> {
    const res = await fetch(`${API_BASE}/api/public/agenda/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json() as Promise<{ ok: boolean; appointment?: { id: string; status: string; startsAt: string; paymentStatus: string }; checkoutUrl?: string | null; paymentMethods?: PaymentMethods; error?: string }>;
}
