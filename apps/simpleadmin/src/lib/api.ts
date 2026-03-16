const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AdminSessionUser = {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'superadmin';
    status?: 'active' | 'verified' | 'suspended';
};

export type AdminLeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
export type AdminLeadSlaSignal = {
    key: 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
    label: string;
    tone: 'attention' | 'urgent';
};

export type AdminOverview = {
    stats: {
        usersTotal: number;
        autosListingsTotal: number;
        propiedadesListingsTotal: number;
        newServiceLeads: number;
    };
    recentUsers: AdminUserListItem[];
    recentListings: AdminListingListItem[];
    recentLeads: AdminServiceLead[];
    systemStatus: AdminSystemStatus;
};

export type AdminUserListItem = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
    status: 'active' | 'verified' | 'suspended';
    provider: string | null;
    createdAt: number;
    lastLoginAt: number | null;
    totalListings: number;
    autosListings: number;
    propiedadesListings: number;
};

export type AdminListingListItem = {
    id: string;
    title: string;
    vertical: 'autos' | 'propiedades';
    section: 'sale' | 'rent' | 'auction' | 'project';
    status: 'draft' | 'active' | 'paused' | 'sold' | 'archived';
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    price: string | null;
    href: string | null;
    createdAt: number;
    updatedAt: number;
};

export type AdminServiceLead = {
    id: string;
    vertical: 'autos' | 'propiedades';
    serviceType: 'venta_asistida' | 'gestion_inmobiliaria';
    serviceLabel: string;
    planId: 'basico' | 'premium';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string | null;
    locationLabel: string | null;
    assetType: string | null;
    assetBrand: string | null;
    assetModel: string | null;
    assetYear: string | null;
    assetMileage: string | null;
    assetArea: string | null;
    expectedPrice: string | null;
    notes: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    statusLabel: string;
    priority: 'low' | 'medium' | 'high';
    priorityLabel: string;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToValue: string | null;
    assignedTo: AdminLeadAssignee | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    nextTaskAgo: string | null;
    sourcePage: string | null;
    lastActivityAt: number;
    lastActivityAgo: string;
    attentionLevel: 'fresh' | 'attention' | 'urgent';
    attentionLabel: string | null;
    slaSignals: AdminLeadSlaSignal[];
    createdAt: number;
    createdAgo: string;
    updatedAt: number;
};

export type AdminLeadAssignee = {
    id: string;
    kind: 'user' | 'team_member';
    value: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'user' | 'admin' | 'superadmin' | null;
    roleTitle: string | null;
    isLeadContact: boolean;
};

export type AdminServiceLeadActivity = {
    id: string;
    type: 'created' | 'note' | 'status' | 'assignment' | 'task' | 'contact';
    label: string;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
    createdAgo: string;
    actor: {
        id: string;
        name: string;
        email: string;
    } | null;
};

export type AdminServiceLeadDetail = {
    item: AdminServiceLead;
    activities: AdminServiceLeadActivity[];
    assignees: AdminLeadAssignee[];
};

export type AdminListingLead = {
    id: string;
    listingId: string;
    vertical: 'autos' | 'propiedades';
    source: 'internal_form' | 'direct_message' | 'whatsapp' | 'phone_call' | 'email' | 'instagram' | 'facebook' | 'mercadolibre' | 'yapo' | 'chileautos' | 'portal';
    sourceLabel: string;
    channel: 'lead' | 'message' | 'social' | 'portal';
    channelLabel: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    contactWhatsapp: string | null;
    message: string | null;
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    statusLabel: string;
    priority: 'low' | 'medium' | 'high';
    priorityLabel: string;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
    assignedToValue: string | null;
    assignedTo: AdminLeadAssignee | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    nextTaskAgo: string | null;
    sourcePage: string | null;
    externalSourceId: string | null;
    lastActivityAt: number;
    lastActivityAgo: string;
    attentionLevel: 'fresh' | 'attention' | 'urgent';
    attentionLabel: string | null;
    slaSignals: AdminLeadSlaSignal[];
    createdAt: number;
    createdAgo: string;
    updatedAt: number;
    listing: {
        id: string;
        title: string;
        href: string;
        section: 'sale' | 'rent' | 'auction' | 'project';
        sectionLabel: string;
        price: string;
        location: string;
    } | null;
    owner: {
        id: string;
        name: string;
        email: string;
    } | null;
    buyer: {
        id: string;
        name: string;
        email: string;
    } | null;
    threadId: string | null;
};

export type AdminListingLeadActivity = {
    id: string;
    type: 'created' | 'note' | 'status' | 'assignment' | 'task' | 'message' | 'contact';
    label: string;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
    createdAgo: string;
    actor: {
        id: string;
        name: string;
        email: string;
    } | null;
};

export type AdminListingLeadDetail = {
    item: AdminListingLead;
    activities: AdminListingLeadActivity[];
    assignees: AdminLeadAssignee[];
    thread: {
        id: string;
        vertical: 'autos' | 'propiedades';
        viewerRole: 'buyer' | 'seller';
        listing: AdminListingLead['listing'];
        counterpart: {
            id: string;
            name: string;
            email: string;
        } | null;
        leadId: string;
        lastMessageAt: number;
        lastMessageAgo: string;
        lastMessagePreview: string | null;
        createdAt: number;
        updatedAt: number;
    } | null;
};

export type AdminSystemStatus = {
    nodeEnv: string;
    databaseConfigured: boolean;
    smtpConfigured: boolean;
    mercadoPagoConfigured: boolean;
    instagramConfigured: boolean;
    leadIngestConfigured: boolean;
    googleOAuthConfigured: boolean;
    sessionConfigured: boolean;
};

type ApiResponse<T> = {
    ok?: boolean;
    error?: string;
} & T;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ response: Response; data: ApiResponse<T> | null }> {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    const data = (await response.json().catch(() => null)) as ApiResponse<T> | null;
    return { response, data };
}

export async function fetchAdminMe(): Promise<{ user: AdminSessionUser | null; unauthorized?: boolean }> {
    try {
        const { response, data } = await apiRequest<{ user?: AdminSessionUser }>('/api/auth/me', { method: 'GET' });
        if (response.status === 401) return { user: null, unauthorized: true };
        if (!data?.ok || !data.user) return { user: null };
        return { user: data.user };
    } catch {
        return { user: null };
    }
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
    try {
        const { data } = await apiRequest<{ user?: AdminSessionUser }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        return Boolean(data?.ok && data.user && (data.user.role === 'admin' || data.user.role === 'superadmin'));
    } catch {
        return false;
    }
}

export async function requestAdminPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const { response, data } = await apiRequest('/api/auth/password-reset/request', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        if (!response.ok || !data?.ok) {
            return { ok: false, error: data?.error || 'No pudimos iniciar la recuperación.' };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'No pudimos iniciar la recuperación.' };
    }
}

export async function logoutAdmin(): Promise<void> {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
        // Best effort.
    }
}

export async function fetchAdminOverview(): Promise<AdminOverview | null> {
    const { response, data } = await apiRequest<AdminOverview>('/api/admin/overview', { method: 'GET' });
    if (!response.ok || !data?.ok || !data.stats) return null;
    return {
        stats: data.stats,
        recentUsers: data.recentUsers ?? [],
        recentListings: data.recentListings ?? [],
        recentLeads: data.recentLeads ?? [],
        systemStatus: data.systemStatus,
    };
}

export async function fetchAdminUsers(): Promise<AdminUserListItem[]> {
    const { response, data } = await apiRequest<{ items?: AdminUserListItem[] }>('/api/admin/users', { method: 'GET' });
    if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function fetchAdminListings(): Promise<AdminListingListItem[]> {
    const { response, data } = await apiRequest<{ items?: AdminListingListItem[] }>('/api/admin/listings', { method: 'GET' });
    if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function fetchAdminServiceLeads(): Promise<AdminServiceLead[]> {
    const { response, data } = await apiRequest<{ items?: AdminServiceLead[] }>('/api/admin/service-leads', { method: 'GET' });
    if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function updateAdminServiceLeadStatus(
    leadId: string,
    changes: {
        status?: AdminServiceLead['status'];
        priority?: AdminServiceLead['priority'];
        closeReason?: string | null;
        tags?: string[];
        assignedToUserId?: string | null;
        assignedToTeamMemberId?: string | null;
        nextTaskTitle?: string | null;
        nextTaskAt?: string | null;
    }
): Promise<{ ok: boolean; item?: AdminServiceLead; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminServiceLead }>(`/api/admin/service-leads/${encodeURIComponent(leadId)}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
        if (!response.ok || !data?.ok || !data.item) {
            return { ok: false, error: data?.error || 'No pudimos actualizar el lead.' };
        }
        return { ok: true, item: data.item };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function fetchAdminServiceLeadDetail(leadId: string): Promise<AdminServiceLeadDetail | null> {
    try {
        const { response, data } = await apiRequest<AdminServiceLeadDetail>(`/api/admin/service-leads/${encodeURIComponent(leadId)}`, {
            method: 'GET',
        });
        if (!response.ok || !data?.ok || !data.item) return null;
        return {
            item: data.item,
            activities: data.activities ?? [],
            assignees: data.assignees ?? [],
        };
    } catch {
        return null;
    }
}

export async function addAdminServiceLeadNote(
    leadId: string,
    body: string
): Promise<{ ok: boolean; item?: AdminServiceLead; activity?: AdminServiceLeadActivity; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminServiceLead; activity?: AdminServiceLeadActivity }>(`/api/admin/service-leads/${encodeURIComponent(leadId)}/notes`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
        if (!response.ok || !data?.ok || !data.item || !data.activity) {
            return { ok: false, error: data?.error || 'No pudimos guardar la nota.' };
        }
        return { ok: true, item: data.item, activity: data.activity };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function runAdminServiceLeadQuickAction(
    leadId: string,
    action: AdminLeadQuickAction
): Promise<{ ok: boolean; item?: AdminServiceLead; activity?: AdminServiceLeadActivity; actionLabel?: string; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminServiceLead; activity?: AdminServiceLeadActivity; actionLabel?: string }>(`/api/admin/service-leads/${encodeURIComponent(leadId)}/actions`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
        if (!response.ok || !data?.ok || !data.item || !data.activity) {
            return { ok: false, error: data?.error || 'No pudimos registrar la acción.' };
        }
        return { ok: true, item: data.item, activity: data.activity, actionLabel: data.actionLabel };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function fetchAdminSystemStatus(): Promise<AdminSystemStatus | null> {
    const { response, data } = await apiRequest<{ status?: AdminSystemStatus }>('/api/admin/system-status', { method: 'GET' });
    if (!response.ok || !data?.ok || !data.status) return null;
    return data.status;
}

export async function fetchAdminListingLeads(): Promise<AdminListingLead[]> {
    const { response, data } = await apiRequest<{ items?: AdminListingLead[] }>('/api/admin/listing-leads', { method: 'GET' });
    if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function fetchAdminListingLeadDetail(leadId: string): Promise<AdminListingLeadDetail | null> {
    try {
        const { response, data } = await apiRequest<AdminListingLeadDetail>(`/api/admin/listing-leads/${encodeURIComponent(leadId)}`, {
            method: 'GET',
        });
        if (!response.ok || !data?.ok || !data.item) return null;
        return {
            item: data.item,
            activities: data.activities ?? [],
            assignees: data.assignees ?? [],
            thread: data.thread ?? null,
        };
    } catch {
        return null;
    }
}

export async function updateAdminListingLeadStatus(
    leadId: string,
    changes: {
        status?: AdminListingLead['status'];
        priority?: AdminListingLead['priority'];
        closeReason?: string | null;
        tags?: string[];
        assignedToUserId?: string | null;
        assignedToTeamMemberId?: string | null;
        nextTaskTitle?: string | null;
        nextTaskAt?: string | null;
    }
): Promise<{ ok: boolean; item?: AdminListingLead; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminListingLead }>(`/api/admin/listing-leads/${encodeURIComponent(leadId)}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
        if (!response.ok || !data?.ok || !data.item) {
            return { ok: false, error: data?.error || 'No pudimos actualizar el lead.' };
        }
        return { ok: true, item: data.item };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function addAdminListingLeadNote(
    leadId: string,
    body: string
): Promise<{ ok: boolean; item?: AdminListingLead; activity?: AdminListingLeadActivity; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminListingLead; activity?: AdminListingLeadActivity }>(`/api/admin/listing-leads/${encodeURIComponent(leadId)}/notes`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
        if (!response.ok || !data?.ok || !data.item || !data.activity) {
            return { ok: false, error: data?.error || 'No pudimos guardar la nota.' };
        }
        return { ok: true, item: data.item, activity: data.activity };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function runAdminListingLeadQuickAction(
    leadId: string,
    action: AdminLeadQuickAction
): Promise<{ ok: boolean; item?: AdminListingLead; activity?: AdminListingLeadActivity; actionLabel?: string; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: AdminListingLead; activity?: AdminListingLeadActivity; actionLabel?: string }>(`/api/admin/listing-leads/${encodeURIComponent(leadId)}/actions`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        });
        if (!response.ok || !data?.ok || !data.item || !data.activity) {
            return { ok: false, error: data?.error || 'No pudimos registrar la acción.' };
        }
        return { ok: true, item: data.item, activity: data.activity, actionLabel: data.actionLabel };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
