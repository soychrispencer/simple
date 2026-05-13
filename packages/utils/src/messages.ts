import { apiFetch } from './api-client.js';

export type MessageVertical = 'autos' | 'propiedades';

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
    leadId: string;
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

export type ThreadLead = {
    id: string;
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    statusLabel: string;
    threadId: string | null;
    listing: MessageThread['listing'];
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    sourceLabel: string;
    channelLabel: string;
    message: string | null;
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
): Promise<{ item: MessageThread; entries: MessageEntry[]; lead: ThreadLead | null } | null> {
    const { ok, data } = await apiFetch<
        ApiResponse<{ item?: MessageThread; entries?: MessageEntry[]; lead?: ThreadLead | null }>
    >(`/api/messages/threads/${encodeURIComponent(threadId)}?vertical=${vertical}`, { method: 'GET' });
    if (!ok || !data?.ok || !data.item) return null;
    return {
        item: data.item,
        entries: data.entries ?? [],
        lead: data.lead ?? null,
    };
}

export async function sendThreadMessage(
    vertical: MessageVertical,
    threadId: string,
    body: string
): Promise<{ ok: boolean; item?: MessageThread; entry?: MessageEntry; lead?: ThreadLead | null; error?: string }> {
    const { ok, data } = await apiFetch<
        ApiResponse<{ item?: MessageThread; entry?: MessageEntry; lead?: ThreadLead | null }>
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
        lead: data.lead ?? null,
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
