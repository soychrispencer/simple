import { apiFetch } from './api-client.js';

export type AccountNotificationPrefs = {
    emailNotifyRequests: boolean;
    emailNotifyAgenda: boolean;
    inAppNotificationsEnabled: boolean;
};

export type AccountUserNotificationRecord = {
    id: string;
    email?: string;
    phone?: string | null;
    emailNotifyInvitations?: boolean;
    emailNotifyRequests?: boolean;
    emailNotifyAgenda?: boolean;
    emailNotifyAccount?: boolean;
    inAppNotificationsEnabled?: boolean;
};

export async function fetchAccountUser(): Promise<{ ok: boolean; user?: AccountUserNotificationRecord; error?: string }> {
    const { data } = await apiFetch<{ ok: boolean; user?: AccountUserNotificationRecord; error?: string }>(
        '/api/auth/me',
        { method: 'GET', credentials: 'include' },
    );
    return data ?? { ok: false, error: 'No pudimos cargar tu cuenta.' };
}

export async function saveAccountNotificationPrefs(
    prefs: AccountNotificationPrefs,
    phone = '',
): Promise<{ ok: boolean; user?: AccountUserNotificationRecord; error?: string }> {
    const { data } = await apiFetch<{ ok: boolean; user?: AccountUserNotificationRecord; error?: string }>(
        '/api/auth/me',
        {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                emailNotifyRequests: prefs.emailNotifyRequests,
                emailNotifyAgenda: prefs.emailNotifyAgenda,
                inAppNotificationsEnabled: prefs.inAppNotificationsEnabled,
            }),
        },
    );
    return data ?? { ok: false, error: 'No pudimos guardar tus preferencias.' };
}

export function accountNotificationPrefsFromUser(
    user: AccountUserNotificationRecord | null | undefined,
): AccountNotificationPrefs {
    return {
        emailNotifyRequests: user?.emailNotifyRequests ?? true,
        emailNotifyAgenda: user?.emailNotifyAgenda ?? true,
        inAppNotificationsEnabled: user?.inAppNotificationsEnabled ?? true,
    };
}
