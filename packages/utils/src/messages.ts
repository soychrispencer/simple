import { apiFetch } from './api-client.js';

export type MessageVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

export type MessageThread = {
    id: string;
    vertical: MessageVertical;
    viewerRole: 'buyer' | 'seller';
    folder: 'inbox' | 'archived' | 'spam';
    unreadCount: number;
    archived: boolean;
    spam: boolean;
    listing: {
        id: string;
        title: string;
        href: string;
        section: 'sale' | 'rent' | 'auction' | 'project';
        sectionLabel: string;
        price: string;
        location: string;
    } | null;
    counterpart: {
        id: string;
        name: string;
        email: string;
    } | null;
    lastMessageAt: number;
    lastMessageAgo: string;
    lastMessagePreview: string | null;
    createdAt: number;
    updatedAt: number;
};

export type MessageEntry = {
    id: string;
    threadId: string;
    senderRole: 'buyer' | 'seller' | 'system';
    body: string;
    createdAt: number;
    createdAgo: string;
    isMine: boolean;
    sender: {
        id: string;
        name: string;
        email: string;
    } | null;
};

type ApiResponse<T> = {
    ok?: boolean;
    error?: string;
} & T;

export async function fetchMessageThreads(
    vertical: MessageVertical,
    folder: MessageThread['folder'] = 'inbox'
): Promise<MessageThread[]> {
    const { ok, data } = await apiFetch<ApiResponse<{ items?: MessageThread[] }>>(
        `/api/messages/threads?vertical=${vertical}&folder=${folder}`,
        { method: 'GET' }
    );
    if (!ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function fetchMessageThreadDetail(
    vertical: MessageVertical,
    threadId: string
): Promise<{ item: MessageThread; entries: MessageEntry[] } | null> {
    const { ok, data } = await apiFetch<
        ApiResponse<{ item?: MessageThread; entries?: MessageEntry[] }>
    >(`/api/messages/threads/${encodeURIComponent(threadId)}?vertical=${vertical}`, { method: 'GET' });
    if (!ok || !data?.ok || !data.item) return null;
    return {
        item: data.item,
        entries: data.entries ?? [],
    };
}

export async function sendThreadMessage(
    vertical: MessageVertical,
    threadId: string,
    body: string
): Promise<{ ok: boolean; item?: MessageThread; entry?: MessageEntry; error?: string }> {
    const { ok, data } = await apiFetch<
        ApiResponse<{ item?: MessageThread; entry?: MessageEntry }>
    >(`/api/messages/threads/${encodeURIComponent(threadId)}/messages?vertical=${vertical}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
    });
    if (!ok || !data?.ok || !data.item || !data.entry) {
        return { ok: false, error: data?.error || 'No pudimos enviar el mensaje.' };
    }
    return {
        ok: true,
        item: data.item,
        entry: data.entry,
    };
}

export async function updateMessageThreadState(
    vertical: MessageVertical,
    threadId: string,
    action: 'read' | 'archive' | 'unarchive' | 'spam' | 'unspam'
): Promise<{ ok: boolean; item?: MessageThread; error?: string }> {
    const { ok, data } = await apiFetch<ApiResponse<{ item?: MessageThread }>>(
        `/api/messages/threads/${encodeURIComponent(threadId)}?vertical=${vertical}`,
        {
            method: 'PATCH',
            body: JSON.stringify({ action }),
        }
    );
    if (!ok || !data?.ok || !data.item) {
        return { ok: false, error: data?.error || 'No pudimos actualizar la conversación.' };
    }
    return { ok: true, item: data.item };
}

export type MessageContextType = 'agenda_appointment' | 'serenata';

export async function fetchMessageThreadByContext(
    vertical: MessageVertical,
    contextType: MessageContextType,
    contextId: string,
): Promise<MessageThread | null> {
    const params = new URLSearchParams({
        vertical,
        contextType,
        contextId,
    });
    const { ok, data } = await apiFetch<ApiResponse<{ thread?: MessageThread | null }>>(
        `/api/messages/threads/by-context?${params.toString()}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return null;
    return data.thread ?? null;
}

export async function submitContextConversation(
    contextType: MessageContextType,
    contextId: string,
    message: string,
): Promise<{ ok: boolean; thread?: MessageThread; error?: string }> {
    const { ok, data } = await apiFetch<ApiResponse<{ thread?: MessageThread; error?: string }>>(
        '/api/messages/context-conversations',
        {
            method: 'POST',
            body: JSON.stringify({ contextType, contextId, message }),
        },
    );
    if (!ok || !data?.ok || !data.thread) {
        return { ok: false, error: data?.error || 'No pudimos enviar el mensaje.' };
    }
    return { ok: true, thread: data.thread };
}

export async function fetchMessageUnreadCount(vertical: MessageVertical): Promise<number> {
    const { ok, data } = await apiFetch<ApiResponse<{ unreadCount?: number }>>(
        `/api/messages/unread-count?vertical=${vertical}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return 0;
    return Math.max(0, data.unreadCount ?? 0);
}

export type MarketplaceContactSource = 'message' | 'saved' | 'follow';

export type MarketplaceContact = {
    id: string;
    buyerUserId: string;
    displayName: string;
    email: string | null;
    threadCount: number;
    unreadCount: number;
    lastMessageAt: number | null;
    lastListingTitle: string | null;
    lastThreadId: string | null;
    sources: MarketplaceContactSource[];
};

export type MarketplaceContactLead = {
    threadId: string;
    listingId: string | null;
    listingTitle: string | null;
    listingHref: string | null;
    unreadCount: number;
    lastMessageAt: number | null;
    lastMessagePreview: string | null;
    folder: 'inbox' | 'archived' | 'spam';
};

export type MarketplaceContactTimelineEvent = {
    id: string;
    type: string;
    occurredAt: string;
    actor: string;
    subjectKind: string;
    subjectId: string;
    payload: Record<string, unknown> | null;
};

export type MarketplaceContactDetail = {
    contact: MarketplaceContact;
    leads: MarketplaceContactLead[];
    events: MarketplaceContactTimelineEvent[];
};

export type MarketplaceContactAssignmentMember = {
    userId: string;
    name: string;
    email: string | null;
    role: string;
};

export type MarketplaceContactStage = 'new' | 'contacted' | 'visit_scheduled' | 'negotiation' | 'won' | 'lost';

export type MarketplaceContactAssignmentContext = {
    workspaceEnabled: boolean;
    teamEnabled: boolean;
    canManage: boolean;
    canUpdateStage: boolean;
    assignedUserId: string | null;
    stage: MarketplaceContactStage;
    members: MarketplaceContactAssignmentMember[];
};

export type MarketplaceContactTaskStatus = 'open' | 'done' | 'cancelled';

export type MarketplaceContactTask = {
    id: string;
    title: string;
    dueAt: string | null;
    status: MarketplaceContactTaskStatus;
    assignedUserId: string | null;
    assignedName: string | null;
    createdByUserId: string;
    createdAt: string;
    completedAt: string | null;
    canUpdate: boolean;
};

export type MarketplaceContactTasksContext = {
    workspaceEnabled: boolean;
    teamEnabled: boolean;
    canManage: boolean;
    viewerUserId: string | null;
    members: MarketplaceContactAssignmentMember[];
    tasks: MarketplaceContactTask[];
};

export async function fetchMarketplaceContacts(
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>,
    q = '',
): Promise<MarketplaceContact[]> {
    const params = new URLSearchParams({ vertical });
    if (q.trim()) params.set('q', q.trim());
    const { ok, data } = await apiFetch<ApiResponse<{ items?: MarketplaceContact[] }>>(
        `/api/messages/contacts?${params.toString()}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok || !Array.isArray(data.items)) return [];
    return data.items;
}

export async function fetchMarketplaceContactDetail(
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>,
    buyerUserId: string,
): Promise<MarketplaceContactDetail | null> {
    const params = new URLSearchParams({
        vertical,
        buyerUserId,
    });
    const { ok, data } = await apiFetch<
        ApiResponse<Partial<MarketplaceContactDetail>>
    >(`/api/messages/contacts/detail?${params.toString()}`, { method: 'GET' });
    if (!ok || !data?.ok || !data.contact) return null;
    return {
        contact: data.contact,
        leads: data.leads ?? [],
        events: data.events ?? [],
    };
}

export async function fetchMarketplaceContactAssignment(
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>,
    personId: string,
): Promise<MarketplaceContactAssignmentContext | null> {
    const params = new URLSearchParams({ vertical, personId });
    const { ok, data } = await apiFetch<ApiResponse<Partial<MarketplaceContactAssignmentContext>>>(
        `/api/messages/contacts/assignment?${params.toString()}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return null;
    return {
        workspaceEnabled: Boolean(data.workspaceEnabled),
        teamEnabled: Boolean(data.teamEnabled),
        canManage: Boolean(data.canManage),
        canUpdateStage: Boolean(data.canUpdateStage),
        assignedUserId: data.assignedUserId ?? null,
        stage: data.stage ?? 'new',
        members: Array.isArray(data.members) ? data.members : [],
    };
}

export async function updateMarketplaceContactAssignment(input: {
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>;
    personId: string;
    assignedUserId?: string | null;
    stage?: MarketplaceContactStage;
}): Promise<{ ok: boolean; error?: string }> {
    const { ok, data } = await apiFetch<ApiResponse<{ error?: string }>>(
        '/api/messages/contacts/assignment',
        {
            method: 'PATCH',
            body: JSON.stringify(input),
        },
    );
    return ok && data?.ok
        ? { ok: true }
        : { ok: false, error: data?.error ?? 'No pudimos cambiar a la persona responsable.' };
}

export async function fetchMarketplaceContactTasks(
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>,
    personId: string,
): Promise<MarketplaceContactTasksContext | null> {
    const params = new URLSearchParams({ vertical, personId });
    const { ok, data } = await apiFetch<ApiResponse<Partial<MarketplaceContactTasksContext>>>(
        `/api/messages/contacts/tasks?${params.toString()}`,
        { method: 'GET' },
    );
    if (!ok || !data?.ok) return null;
    return {
        workspaceEnabled: Boolean(data.workspaceEnabled),
        teamEnabled: Boolean(data.teamEnabled),
        canManage: Boolean(data.canManage),
        viewerUserId: data.viewerUserId ?? null,
        members: Array.isArray(data.members) ? data.members : [],
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
    };
}

export async function createMarketplaceContactTask(input: {
    vertical: Extract<MessageVertical, 'autos' | 'propiedades'>;
    personId: string;
    title: string;
    dueAt?: string | null;
    assignedUserId?: string | null;
}): Promise<{ ok: boolean; error?: string; task?: MarketplaceContactTask }> {
    const { ok, data } = await apiFetch<ApiResponse<{ error?: string; task?: MarketplaceContactTask }>>(
        '/api/messages/contacts/tasks',
        { method: 'POST', body: JSON.stringify(input) },
    );
    return ok && data?.ok && data.task
        ? { ok: true, task: data.task }
        : { ok: false, error: data?.error ?? 'No pudimos guardar el seguimiento.' };
}

export async function updateMarketplaceContactTask(
    taskId: string,
    patch: Partial<Pick<MarketplaceContactTask, 'title' | 'dueAt' | 'status' | 'assignedUserId'>>,
): Promise<{ ok: boolean; error?: string }> {
    const { ok, data } = await apiFetch<ApiResponse<{ error?: string }>>(
        `/api/messages/contacts/tasks/${encodeURIComponent(taskId)}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
    );
    return ok && data?.ok
        ? { ok: true }
        : { ok: false, error: data?.error ?? 'No pudimos actualizar el seguimiento.' };
}

export function notifyPanelMessagesChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('simple:panel-notifications-changed'));
}
