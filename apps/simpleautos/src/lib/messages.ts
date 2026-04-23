import { API_BASE } from '@simple/config';

const VERTICAL = 'autos';

export type MessageThread = {
    id: string;
    vertical: 'autos';
    viewerRole: 'buyer' | 'seller';
    folder: 'inbox' | 'archived' | 'spam';
    unreadCount: number;
    archived: boolean;
    spam: boolean;
    listing: {
        id: string;
        title: string;
        href: string;
        section: 'sale' | 'rent' | 'auction';
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

export async function fetchMessageThreads(folder: MessageThread['folder'] = 'inbox'): Promise<MessageThread[]> {
    try {
        const { response, data } = await apiRequest<{ items?: MessageThread[] }>(`/api/messages/threads?vertical=${VERTICAL}&folder=${folder}`, { method: 'GET' });
        if (!response.ok || !data?.ok || !Array.isArray(data.items)) return [];
        return data.items;
    } catch {
        return [];
    }
}

export async function fetchMessageThreadDetail(threadId: string): Promise<{ item: MessageThread; entries: MessageEntry[]; lead: ThreadLead | null } | null> {
    try {
        const { response, data } = await apiRequest<{ item?: MessageThread; entries?: MessageEntry[]; lead?: ThreadLead | null }>(`/api/messages/threads/${encodeURIComponent(threadId)}?vertical=${VERTICAL}`, { method: 'GET' });
        if (!response.ok || !data?.ok || !data.item) return null;
        return {
            item: data.item,
            entries: data.entries ?? [],
            lead: data.lead ?? null,
        };
    } catch {
        return null;
    }
}

export async function sendThreadMessage(threadId: string, body: string): Promise<{ ok: boolean; item?: MessageThread; entry?: MessageEntry; lead?: ThreadLead | null; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: MessageThread; entry?: MessageEntry; lead?: ThreadLead | null }>(`/api/messages/threads/${encodeURIComponent(threadId)}/messages?vertical=${VERTICAL}`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
        if (!response.ok || !data?.ok || !data.item || !data.entry) {
            return { ok: false, error: data?.error || 'No pudimos enviar el mensaje.' };
        }
        return {
            ok: true,
            item: data.item,
            entry: data.entry,
            lead: data.lead ?? null,
        };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function updateMessageThreadState(
    threadId: string,
    action: 'read' | 'archive' | 'unarchive' | 'spam' | 'unspam'
): Promise<{ ok: boolean; item?: MessageThread; error?: string }> {
    try {
        const { response, data } = await apiRequest<{ item?: MessageThread }>(`/api/messages/threads/${encodeURIComponent(threadId)}?vertical=${VERTICAL}`, {
            method: 'PATCH',
            body: JSON.stringify({ action }),
        });
        if (!response.ok || !data?.ok || !data.item) {
            return { ok: false, error: data?.error || 'No pudimos actualizar la conversación.' };
        }
        return { ok: true, item: data.item };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
