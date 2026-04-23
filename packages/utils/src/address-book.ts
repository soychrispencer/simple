import { API_BASE } from '@simple/config';
import type { AddressBookEntry } from '@simple/types';

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

export async function fetchAddressBook(): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>('/api/address-book', {
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
