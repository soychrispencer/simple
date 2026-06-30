export type UserNotificationPrefs = {
    userId: string;
    email: string;
    phone: string | null;
    emailNotifyAccount: boolean;
    emailNotifyInvitations: boolean;
    emailNotifyRequests: boolean;
    emailNotifyAgenda: boolean;
    inAppNotificationsEnabled: boolean;
};

type PrefsRow = {
    id: string;
    email: string;
    phone: string | null;
    emailNotifyAccount: boolean;
    emailNotifyInvitations: boolean;
    emailNotifyRequests?: boolean | null;
    emailNotifyAgenda: boolean;
    inAppNotificationsEnabled: boolean;
};

/** Defaults alineados con el cliente (null → true en correo). */
export function resolveNotificationPrefs(row: PrefsRow): UserNotificationPrefs {
    return {
        userId: row.id,
        email: row.email,
        phone: row.phone,
        emailNotifyAccount: row.emailNotifyAccount ?? true,
        emailNotifyInvitations: row.emailNotifyInvitations ?? true,
        emailNotifyRequests: row.emailNotifyRequests ?? row.emailNotifyAgenda ?? true,
        emailNotifyAgenda: row.emailNotifyAgenda ?? true,
        inAppNotificationsEnabled: row.inAppNotificationsEnabled ?? true,
    };
}

export function shouldSendAccountEmail(prefs: UserNotificationPrefs): boolean {
    return prefs.emailNotifyAccount !== false;
}

export function shouldSendInvitationEmail(prefs: UserNotificationPrefs): boolean {
    return prefs.emailNotifyInvitations !== false;
}

export function shouldSendRequestsEmail(prefs: UserNotificationPrefs): boolean {
    return prefs.emailNotifyRequests !== false;
}

export function shouldSendAgendaEmail(prefs: UserNotificationPrefs): boolean {
    return prefs.emailNotifyAgenda !== false;
}

export function shouldCreateInAppNotification(prefs: UserNotificationPrefs | null | undefined): boolean {
    if (!prefs) return true;
    return prefs.inAppNotificationsEnabled !== false;
}
