import { API_BASE } from '@simple/config';

export type AccountNotificationUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    inAppNotificationsEnabled?: boolean;
    emailNotifyAccount?: boolean;
    emailNotifyAgenda?: boolean;
    emailNotifyInvitations?: boolean;
    emailNotifyRequests?: boolean;
};

export type UpdateAccountNotificationPrefsInput = {
    inAppNotificationsEnabled?: boolean;
    emailNotifyAccount?: boolean;
    emailNotifyAgenda?: boolean;
    emailNotifyInvitations?: boolean;
    emailNotifyRequests?: boolean;
    phone?: string | null;
};

export async function fetchAccountNotificationUser(): Promise<AccountNotificationUser | null> {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        const data = await response.json().catch(() => null) as { ok?: boolean; user?: AccountNotificationUser | null } | null;
        return data?.user ?? null;
    } catch {
        return null;
    }
}

export async function updateAccountNotificationPrefs(
    payload: UpdateAccountNotificationPrefsInput,
): Promise<{ ok: boolean; user?: AccountNotificationUser; error?: string; unauthorized?: boolean }> {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => null) as {
            ok?: boolean;
            user?: AccountNotificationUser;
            error?: string;
        } | null;
        if (response.status === 401) {
            return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
        }
        if (!response.ok || !data?.ok) {
            return { ok: false, error: data?.error ?? 'No pudimos guardar tus preferencias.' };
        }
        return { ok: true, user: data.user };
    } catch {
        return { ok: false, error: 'No pudimos conectar con el backend.' };
    }
}
