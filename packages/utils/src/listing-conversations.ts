import { apiFetch } from './api-client.js';
import type { MessageThread } from './messages.js';

type ListingVertical = 'autos' | 'propiedades';

type ListingConversationInput = {
    listingId: string;
    message: string;
    contactName?: string;
};

type ListingConversationResponse = {
    ok?: boolean;
    error?: string;
    thread?: MessageThread;
    createdThread?: boolean;
};

export async function submitListingConversation(
    vertical: ListingVertical,
    input: ListingConversationInput,
): Promise<{ ok: boolean; thread?: MessageThread; error?: string }> {
    const { ok, data } = await apiFetch<ListingConversationResponse>(
        '/api/messages/listing-conversations',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                listingId: input.listingId,
                message: input.message,
                contactName: input.contactName,
            }),
        },
    );

    if (!ok || !data?.ok || !data.thread) {
        return { ok: false, error: data?.error || 'No pudimos enviar tu mensaje.' };
    }

    void vertical;
    return { ok: true, thread: data.thread };
}
