import { API_BASE } from '@simple/config';
import { uploadMediaFile } from './media-upload.js';

type UpdateProfileResponse = {
    ok: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
        phone?: string | null;
        role: 'user' | 'admin' | 'superadmin';
        avatar?: string;
    };
    error?: string;
};

export async function updateAccountProfile(input: {
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
}): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
                ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
            }),
        });

        const data = (await response.json().catch(() => null)) as UpdateProfileResponse | null;
        if (response.status === 401) {
            return {
                ok: false,
                unauthorized: true,
                error: 'Tu sesión expiró. Vuelve a iniciar sesión.',
            };
        }
        if (!response.ok || !data?.ok) {
            return {
                ok: false,
                error: data?.error ?? 'No pudimos actualizar tu perfil.',
            };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}

export async function uploadAccountAvatar(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
    const upload = await uploadMediaFile(file, { fileType: 'image', purpose: 'avatar' });
    const url = upload.result?.url;
    if (!upload.ok || !url) {
        return { ok: false, error: upload.error || 'No pudimos subir tu foto.' };
    }
    const saved = await updateAccountProfile({ avatarUrl: url });
    if (!saved.ok) return { ok: false, error: saved.error || 'No pudimos guardar tu foto.' };
    return { ok: true, url };
}

type AccountApiResponse<T = unknown> = {
    ok: boolean;
    error?: string;
} & T;

async function accountFetch<T = unknown>(
    path: string,
    init: RequestInit,
): Promise<AccountApiResponse<T> & { unauthorized?: boolean }> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init.headers || {}),
            },
            ...init,
        });
        const data = (await response.json().catch(() => null)) as AccountApiResponse<T> | null;
        if (response.status === 401) {
            return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' } as AccountApiResponse<T> & { unauthorized?: boolean };
        }
        if (!response.ok || !data?.ok) {
            return { ok: false, error: data?.error || 'No pudimos completar la acción.' } as AccountApiResponse<T> & { unauthorized?: boolean };
        }
        return data as AccountApiResponse<T> & { unauthorized?: boolean };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' } as AccountApiResponse<T> & { unauthorized?: boolean };
    }
}

export async function requestAccountEmailChange(newEmail: string) {
    return accountFetch<{ pendingEmail?: string }>('/api/accounts/request-email-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
    });
}

export async function cancelAccountEmailChange() {
    return accountFetch('/api/accounts/cancel-email-change', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

export async function changeAccountPassword(input: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
}) {
    return accountFetch<{ user?: unknown }>('/api/auth/password/change', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function disconnectAccountGoogle() {
    return accountFetch<{ disconnected?: boolean; user?: unknown }>('/api/auth/google/disconnect', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

export async function activateAccountPlatform(app?: string) {
    return accountFetch<{ user?: unknown }>('/api/auth/platform-access/activate', {
        method: 'POST',
        body: JSON.stringify(app ? { app } : {}),
    });
}

export async function deleteAccount(input: {
    password?: string;
    confirmPhrase?: string;
}) {
    return accountFetch('/api/auth/me', {
        method: 'DELETE',
        body: JSON.stringify(input),
    });
}
