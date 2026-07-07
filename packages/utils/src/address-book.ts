import { API_BASE } from '@simple/config';
import type { AddressBookBusinessVertical, AddressBookEntry, AddressBookScope } from '@simple/types';

type ApiResponse<T> = {
    ok: boolean;
    items?: T[];
    item?: T;
    error?: string;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });
        const data = await response.json().catch(() => null);
        return data || { ok: false, error: 'Respuesta inválida del servidor.' };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

function addressBookPath(options?: { scope?: AddressBookScope; vertical?: AddressBookBusinessVertical }): string {
    const params = new URLSearchParams();
    if (options?.scope) params.set('scope', options.scope);
    if (options?.vertical) params.set('vertical', options.vertical);
    const query = params.toString();
    return query ? `/api/address-book?${query}` : '/api/address-book';
}

/** Libreta para publicar: negocio (vertical) + personal, negocio primero. */
export async function fetchPublishAddressBook(
    vertical: AddressBookBusinessVertical,
): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const [businessResult, personalResult] = await Promise.all([
        fetchAddressBook({ scope: 'business', vertical }),
        fetchAddressBook({ scope: 'personal' }),
    ]);
    const items = [...businessResult.items, ...personalResult.items];
    return {
        ok: businessResult.ok && personalResult.ok,
        items,
        error: businessResult.error || personalResult.error,
    };
}

export function pickDefaultPublishAddress(
    entries: AddressBookEntry[],
    vertical?: AddressBookBusinessVertical,
): AddressBookEntry | null {
    const business = entries.filter((entry) => entry.scope === 'business' && (
        !vertical || entry.vertical === vertical || entry.vertical == null
    ));
    const personal = entries.filter((entry) => entry.scope === 'personal');
    const businessDefault = business.find((entry) => entry.isDefault) ?? business[0];
    if (businessDefault) return businessDefault;
    return personal.find((entry) => entry.isDefault) ?? personal[0] ?? null;
}

export async function fetchAddressBook(options?: {
    scope?: AddressBookScope;
    vertical?: AddressBookBusinessVertical;
}): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>(addressBookPath(options), {
        method: 'GET',
    });
    const data = result as { items?: AddressBookEntry[] };
    return {
        ok: result.ok,
        items: data.items || [],
        error: result.error,
    };
}

export async function createAddressBookEntry(input: unknown): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>('/api/address-book', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const data = result as { items?: AddressBookEntry[] };
    return {
        ok: result.ok,
        items: data.items || [],
        error: result.error,
    };
}

export async function updateAddressBookEntry(id: string, input: unknown): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>(`/api/address-book/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
    const data = result as { items?: AddressBookEntry[] };
    return {
        ok: result.ok,
        items: data.items || [],
        error: result.error,
    };
}

export async function deleteAddressBookEntry(id: string): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>(`/api/address-book/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    const data = result as { items?: AddressBookEntry[] };
    return {
        ok: result.ok,
        items: data.items || [],
        error: result.error,
    };
}
