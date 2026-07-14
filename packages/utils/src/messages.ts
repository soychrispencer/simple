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

export function notifyPanelMessagesChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('simple:panel-notifications-changed'));
}
