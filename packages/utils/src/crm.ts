const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type CrmLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type CrmLeadPriority = 'low' | 'medium' | 'high';
export type CrmLeadAttentionLevel = 'fresh' | 'attention' | 'urgent';
export type CrmLeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
export type CrmLeadSlaSignal = {
    key: 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
    label: string;
    tone: Exclude<CrmLeadAttentionLevel, 'fresh'>;
};

export type CrmAssignee = {
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

export type CrmLead = {
    id: string;
    vertical: 'autos' | 'propiedades';
    serviceType: string;
    serviceLabel: string;
    planId: 'basico' | 'premium';
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string | null;
    locationLabel: string | null;
    assetType: string | null;
    // Autos specific
    assetBrand?: string | null;
    assetModel?: string | null;
    assetYear?: string | null;
    assetMileage?: string | null;
    // Propiedades specific
    assetArea?: string | null;
    expectedPrice: string | null;
    notes: string | null;
    status: CrmLeadStatus;
    statusLabel: string;
    priority: CrmLeadPriority;
    priorityLabel: string;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToValue: string | null;
    assignedTo: CrmAssignee | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    nextTaskAgo: string | null;
    sourcePage: string | null;
    lastActivityAt: number;
    lastActivityAgo: string;
    attentionLevel: CrmLeadAttentionLevel;
    attentionLabel: string | null;
    slaSignals: CrmLeadSlaSignal[];
    createdAt: number;
    createdAgo: string;
    updatedAt: number;
};

export type CrmLeadActivity = {
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

export type CrmLeadDetail = {
    item: CrmLead;
    activities: CrmLeadActivity[];
    assignees: CrmAssignee[];
};

export type CrmListingLeadStatus = CrmLeadStatus;

export type CrmPipelineColumn = {
    id: string;
    userId: string;
    vertical: 'autos' | 'propiedades';
    scope: 'listing';
    name: string;
    status: CrmListingLeadStatus;
    statusLabel: string;
    position: number;
    createdAt: number;
    updatedAt: number;
};

export type CrmListingLead = {
    id: string;
    listingId: string;
    vertical: 'autos' | 'propiedades';
    source: string;
    sourceLabel: string;
    channel: 'lead' | 'message' | 'social' | 'portal';
    channelLabel: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    contactWhatsapp: string | null;
    message: string | null;
    status: CrmListingLeadStatus;
    statusLabel: string;
    pipelineColumnId: string | null;
    pipelineColumnName: string | null;
    priority: CrmLeadPriority;
    priorityLabel: string;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
    assignedToValue: string | null;
    assignedTo: CrmAssignee | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    nextTaskAgo: string | null;
    sourcePage: string | null;
    externalSourceId: string | null;
    lastActivityAt: number;
    lastActivityAgo: string;
    attentionLevel: CrmLeadAttentionLevel;
    attentionLabel: string | null;
    slaSignals: CrmLeadSlaSignal[];
    createdAt: number;
    createdAgo: string;
    updatedAt: number;
    listing: {
        id: string;
        title: string;
        href: string;
        section: string;
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

export type CrmListingLeadActivity = {
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

export type CrmListingLeadDetail = {
    item: CrmListingLead;
    activities: CrmListingLeadActivity[];
    assignees: CrmAssignee[];
    thread: {
        id: string;
        vertical: 'autos' | 'propiedades';
        viewerRole: 'buyer' | 'seller';
        listing: CrmListingLead['listing'];
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

export async function fetchCrmLeads(vertical: string): Promise<CrmLead[]> {
    try {
        const { response, data } = await apiRequest<{ items?: CrmLead[] }>(`/api/crm/leads?vertical=${vertical}`, {
            method: 'GET',
        });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
        return data.items;
    } catch {
        return [];
    }
}

export async function fetchCrmLeadDetail(leadId: string, vertical: string): Promise<CrmLeadDetail | null> {
    try {
        const { response, data } = await apiRequest<CrmLeadDetail>(`/api/crm/leads/${encodeURIComponent(leadId)}?vertical=${vertical}`, {
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

export async function updateCrmLead(
    leadId: string,
    vertical: string,
    changes: {
        status?: CrmLeadStatus;
        priority?: CrmLeadPriority;
        closeReason?: string | null;
        tags?: string[];
        assignedToUserId?: string | null;
        assignedToTeamMemberId?: string | null;
        nextTaskTitle?: string | null;
        nextTaskAt?: string | null;
    }
): Promise<{ ok: boolean; item?: CrmLead; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmLead }>(`/api/crm/leads/${encodeURIComponent(leadId)}?vertical=${vertical}`, {
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

export async function addCrmLeadNote(
    leadId: string,
    vertical: string,
    body: string
): Promise<{ ok: boolean; item?: CrmLead; activity?: CrmLeadActivity; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmLead; activity?: CrmLeadActivity }>(`/api/crm/leads/${encodeURIComponent(leadId)}/notes?vertical=${vertical}`, {
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

export async function runCrmLeadQuickAction(
    leadId: string,
    vertical: string,
    action: CrmLeadQuickAction
): Promise<{ ok: boolean; item?: CrmLead; activity?: CrmLeadActivity; actionLabel?: string; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmLead; activity?: CrmLeadActivity; actionLabel?: string }>(`/api/crm/leads/${encodeURIComponent(leadId)}/actions?vertical=${vertical}`, {
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

export async function fetchCrmListingLeads(vertical: string): Promise<CrmListingLead[]> {
    try {
        const { response, data } = await apiRequest<{ items?: CrmListingLead[] }>(`/api/crm/listing-leads?vertical=${vertical}`, {
            method: 'GET',
        });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
        return data.items;
    } catch {
        return [];
    }
}

export async function fetchCrmPipelineColumns(vertical: string): Promise<CrmPipelineColumn[]> {
    try {
        const { response, data } = await apiRequest<{ items?: CrmPipelineColumn[] }>(`/api/crm/pipeline-columns?vertical=${vertical}`, {
            method: 'GET',
        });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
        return data.items;
    } catch {
        return [];
    }
}

export async function fetchCrmListingLeadDetail(leadId: string, vertical: string): Promise<CrmListingLeadDetail | null> {
    try {
        const { response, data } = await apiRequest<CrmListingLeadDetail>(`/api/crm/listing-leads/${encodeURIComponent(leadId)}?vertical=${vertical}`, {
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

export async function updateCrmListingLead(
    leadId: string,
    vertical: string,
    changes: {
        status?: CrmListingLeadStatus;
        pipelineColumnId?: string | null;
        priority?: CrmLeadPriority;
        closeReason?: string | null;
        tags?: string[];
        assignedToUserId?: string | null;
        assignedToTeamMemberId?: string | null;
        nextTaskTitle?: string | null;
        nextTaskAt?: string | null;
    }
): Promise<{ ok: boolean; item?: CrmListingLead; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmListingLead }>(`/api/crm/listing-leads/${encodeURIComponent(leadId)}?vertical=${vertical}`, {
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

export async function createCrmPipelineColumn(
    vertical: string,
    input: {
        name: string;
        status: CrmListingLeadStatus;
    }
): Promise<{ ok: boolean; item?: CrmPipelineColumn; items?: CrmPipelineColumn[]; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmPipelineColumn; items?: CrmPipelineColumn[] }>(`/api/crm/pipeline-columns?vertical=${vertical}`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
        if (!response.ok || !data?.ok || !data.item || !Array.isArray(data.items)) {
            return { ok: false, error: data?.error || 'No pudimos crear la columna.' };
        }
        return { ok: true, item: data.item, items: data.items };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function updateCrmPipelineColumn(
    columnId: string,
    vertical: string,
    input: {
        name?: string;
        status?: CrmListingLeadStatus;
    }
): Promise<{ ok: boolean; item?: CrmPipelineColumn; items?: CrmPipelineColumn[]; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmPipelineColumn; items?: CrmPipelineColumn[] }>(`/api/crm/pipeline-columns/${encodeURIComponent(columnId)}?vertical=${vertical}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
        });
        if (!response.ok || !data?.ok || !data.item || !Array.isArray(data.items)) {
            return { ok: false, error: data?.error || 'No pudimos actualizar la columna.' };
        }
        return { ok: true, item: data.item, items: data.items };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function deleteCrmPipelineColumn(
    columnId: string,
    vertical: string
): Promise<{ ok: boolean; items?: CrmPipelineColumn[]; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ items?: CrmPipelineColumn[] }>(`/api/crm/pipeline-columns/${encodeURIComponent(columnId)}?vertical=${vertical}`, {
            method: 'DELETE',
        });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) {
            return { ok: false, error: data?.error || 'No pudimos eliminar la columna.' };
        }
        return { ok: true, items: data.items };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function reorderCrmPipelineColumns(
    vertical: string,
    columnIds: string[]
): Promise<{ ok: boolean; items?: CrmPipelineColumn[]; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ items?: CrmPipelineColumn[] }>(`/api/crm/pipeline-columns/reorder?vertical=${vertical}`, {
            method: 'POST',
            body: JSON.stringify({ columnIds }),
        });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) {
            return { ok: false, error: data?.error || 'No pudimos reordenar las columnas.' };
        }
        return { ok: true, items: data.items };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function addCrmListingLeadNote(
    leadId: string,
    vertical: string,
    body: string
): Promise<{ ok: boolean; item?: CrmListingLead; activity?: CrmListingLeadActivity; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmListingLead; activity?: CrmListingLeadActivity }>(`/api/crm/listing-leads/${encodeURIComponent(leadId)}/notes?vertical=${vertical}`, {
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

export async function runCrmListingLeadQuickAction(
    leadId: string,
    vertical: string,
    action: CrmLeadQuickAction
): Promise<{ ok: boolean; item?: CrmListingLead; activity?: CrmListingLeadActivity; actionLabel?: string; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: CrmListingLead; activity?: CrmListingLeadActivity; actionLabel?: string }>(`/api/crm/listing-leads/${encodeURIComponent(leadId)}/actions?vertical=${vertical}`, {
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
