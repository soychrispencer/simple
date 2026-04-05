import { API_BASE } from '@simple/config';

export type AddressBookEntry = {
    id: string;
    kind: string;
    label: string;
    location: {
        countryCode: string;
        regionId: string;
        regionName: string;
        communeId: string;
        communeName: string;
        neighborhood?: string | null;
        addressLine1: string;
        addressLine2?: string | null;
        postalCode?: string | null;
        geoPoint?: { lat: number; lng: number } | null;
    };
    contactName: string;
    contactPhone: string;
    isDefault: boolean;
};

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
    const result = await apiRequest<{ items: AddressBookEntry[] }>('/api/account/address-book', {
        method: 'GET',
    });
    return {
        ok: result.ok,
        items: (result as any).items || [],
        error: result.error,
    };
}

export async function createAddressBookEntry(input: any): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>('/api/account/address-book', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return {
        ok: result.ok,
        items: (result as any).items || [],
        error: result.error,
    };
}

export async function updateAddressBookEntry(id: string, input: any): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>(`/api/account/address-book/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
    });
    return {
        ok: result.ok,
        items: (result as any).items || [],
        error: result.error,
    };
}

export async function deleteAddressBookEntry(id: string): Promise<{ ok: boolean; items: AddressBookEntry[]; error?: string }> {
    const result = await apiRequest<{ items: AddressBookEntry[] }>(`/api/account/address-book/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    return {
        ok: result.ok,
        items: (result as any).items || [],
        error: result.error,
    };
}
