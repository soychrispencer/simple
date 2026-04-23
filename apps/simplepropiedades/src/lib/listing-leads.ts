import { API_BASE } from '@simple/config';

const VERTICAL = 'propiedades';

export type ListingLeadSubmissionResult = {
    ok: boolean;
    item?: {
        id: string;
        threadId: string | null;
    };
    thread?: {
        id: string;
    } | null;
    error?: string;
};

export async function submitListingLead(input: {
    listingId: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message: string;
    sourcePage?: string | null;
}): Promise<ListingLeadSubmissionResult> {
    try {
        const response = await fetch(`${API_BASE}/api/listing-leads`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vertical: VERTICAL,
                listingId: input.listingId,
                contactName: input.contactName,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone ?? null,
                contactWhatsapp: input.contactWhatsapp ?? null,
                message: input.message,
                sourcePage: input.sourcePage ?? null,
                createThread: true,
                acceptedTerms: true,
            }),
        });
        const data = (await response.json().catch(() => null)) as {
            ok?: boolean;
            item?: { id: string; threadId?: string | null };
            thread?: { id: string } | null;
            error?: string;
        } | null;

        if (!response.ok || !data?.ok || !data.item) {
            return { ok: false, error: data?.error || 'No pudimos enviar tu consulta.' };
        }

        return {
            ok: true,
            item: {
                id: data.item.id,
                threadId: data.item.threadId ?? null,
            },
            thread: data.thread ?? null,
        };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function submitListingLeadAction(input: {
    listingId: string;
    source: 'whatsapp' | 'phone_call' | 'email';
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message?: string | null;
    sourcePage?: string | null;
}): Promise<ListingLeadSubmissionResult> {
    try {
        const response = await fetch(`${API_BASE}/api/listing-leads/actions`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vertical: VERTICAL,
                listingId: input.listingId,
                source: input.source,
                contactName: input.contactName,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone ?? null,
                contactWhatsapp: input.contactWhatsapp ?? null,
                message: input.message ?? null,
                sourcePage: input.sourcePage ?? null,
                acceptedTerms: true,
            }),
        });
        const data = (await response.json().catch(() => null)) as {
            ok?: boolean;
            item?: { id: string; threadId?: string | null };
            error?: string;
        } | null;

        if (!response.ok || !data?.ok || !data.item) {
            return { ok: false, error: data?.error || 'No pudimos registrar la acción de contacto.' };
        }

        return {
            ok: true,
            item: {
                id: data.item.id,
                threadId: data.item.threadId ?? null,
            },
            thread: null,
        };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
