import { API_BASE as API_BASE_CONFIG } from '@simple/config';

const API_BASE = `${API_BASE_CONFIG}/api`;

async function fetchApi(method: string, path: string, body?: unknown) {
    const url = `${API_BASE}${path}`;
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    let res: Response;
    try {
        res = await fetch(url, options);
    } catch (networkError) {
        throw new Error('Error de conexión: verifica tu internet o que el servidor esté activo');
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
        throw new Error(errorData.error || `Error ${res.status}`);
    }
    return res.json();
}

export interface Address {
    id: string;
    label: string | null;
    regionId: string | null;
    regionName: string;
    communeId: string | null;
    communeName: string;
    neighborhood: string | null;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string | null;
    arrivalInstructions: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProfileData {
    name?: string;
    phone?: string;
    avatarUrl?: string;
}

// Actualizar perfil del usuario
export async function updateProfile(data: UpdateProfileData) {
    const response = await fetchApi('PATCH', '/auth/me', data);
    return response.user;
}

// Obtener direcciones del usuario
export async function getAddresses(): Promise<Address[]> {
    const response = await fetchApi('GET', '/address-book');
    return response.items || [];
}

export interface CreateAddressData {
    kind?: string;
    label: string;
    countryCode?: string;
    regionId: string;
    regionName: string;
    communeId: string;
    communeName: string;
    neighborhood?: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode?: string;
    arrivalInstructions?: string;
    isDefault?: boolean;
}

// Crear nueva dirección
export async function createAddress(data: CreateAddressData) {
    const response = await fetchApi('POST', '/address-book', {
        kind: 'personal',
        countryCode: 'CL',
        ...data,
    });
    return response.items; // Retorna todas las direcciones actualizadas
}

// Actualizar dirección
export async function updateAddress(addressId: string, data: Partial<CreateAddressData>) {
    const response = await fetchApi('PATCH', `/address-book/${addressId}`, data);
    return response.items; // Retorna todas las direcciones actualizadas
}

// Eliminar dirección
export async function deleteAddress(addressId: string) {
    const response = await fetchApi('DELETE', `/address-book/${addressId}`);
    return response.items; // Retorna todas las direcciones actualizadas
}
