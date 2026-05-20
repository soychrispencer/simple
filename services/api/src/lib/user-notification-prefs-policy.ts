export type EmailDigestFrequency = 'off' | 'daily' | 'weekly';

export type UserNotificationPrefs = {
    userId: string;
    email: string;
    phone: string | null;
    emailNotifyAccount: boolean;
    emailNotifyInvitations: boolean;
    emailNotifyRequests: boolean;
    emailNotifyAgenda: boolean;
    whatsappNotifyInvitations: boolean;
    whatsappNotifyRequests: boolean;
    whatsappNotifyAgenda: boolean;
    whatsappNotifyAccount: boolean;
    /** Legacy: true si algún canal WhatsApp por categoría está activo. */
    whatsappEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    emailDigestFrequency: EmailDigestFrequency;
};

type PrefsRow = {
    id: string;
    email: string;
    phone: string | null;
    emailNotifyAccount: boolean;
    emailNotifyInvitations: boolean;
    emailNotifyRequests?: boolean | null;
    emailNotifyAgenda: boolean;
    whatsappNotifyInvitations?: boolean | null;
    whatsappNotifyRequests?: boolean | null;
    whatsappNotifyAgenda?: boolean | null;
    whatsappNotifyAccount?: boolean | null;
    whatsappEnabled: boolean;
    inAppNotificationsEnabled: boolean;
    emailDigestFrequency?: string | null;
};

function resolveWhatsAppCategoryFlags(row: PrefsRow): {
    invitations: boolean;
    requests: boolean;
    agenda: boolean;
    account: boolean;
} {
    const legacy = row.whatsappEnabled === true;
    return {
        invitations: row.whatsappNotifyInvitations ?? legacy,
        requests: row.whatsappNotifyRequests ?? legacy,
        agenda: row.whatsappNotifyAgenda ?? legacy,
        account: row.whatsappNotifyAccount ?? false,
    };
}

/** Defaults alineados con el cliente Serenatas (null → true en correo). */
export function resolveNotificationPrefs(row: PrefsRow): UserNotificationPrefs {
    const whatsapp = resolveWhatsAppCategoryFlags(row);
    return {
        userId: row.id,
        email: row.email,
        phone: row.phone,
        emailNotifyAccount: row.emailNotifyAccount ?? true,
        emailNotifyInvitations: row.emailNotifyInvitations ?? true,
        emailNotifyRequests: row.emailNotifyRequests ?? row.emailNotifyAgenda ?? true,
        emailNotifyAgenda: row.emailNotifyAgenda ?? true,
        whatsappNotifyInvitations: whatsapp.invitations === true,
        whatsappNotifyRequests: whatsapp.requests === true,
        whatsappNotifyAgenda: whatsapp.agenda === true,
        whatsappNotifyAccount: whatsapp.account === true,
        whatsappEnabled:
            whatsapp.invitations
            || whatsapp.requests
            || whatsapp.agenda
            || whatsapp.account,
        inAppNotificationsEnabled: row.inAppNotificationsEnabled ?? true,
        emailDigestFrequency: normalizeEmailDigestFrequency(row.emailDigestFrequency),
    };
}

function normalizeEmailDigestFrequency(value: string | null | undefined): EmailDigestFrequency {
    if (value === 'daily' || value === 'weekly') return value;
    return 'off';
}

function hasWhatsAppPhone(prefs: UserNotificationPrefs): boolean {
    return Boolean(prefs.phone?.trim());
}

/** Invitaciones, solicitudes y agenda pueden agruparse en digest; cuenta y urgentes no. */
export function shouldDeferSerenatasEmailForDigest(
    prefs: UserNotificationPrefs,
    category: 'invitation' | 'requests' | 'agenda',
): boolean {
    if (prefs.emailDigestFrequency === 'off') return false;
    if (category === 'invitation' && !shouldSendInvitationEmail(prefs)) return false;
    if (category === 'requests' && !shouldSendRequestsEmail(prefs)) return false;
    if (category === 'agenda' && !shouldSendAgendaEmail(prefs)) return false;
    return false;
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

export function shouldSendInvitationWhatsApp(prefs: UserNotificationPrefs): boolean {
    return hasWhatsAppPhone(prefs) && prefs.whatsappNotifyInvitations === true;
}

export function shouldSendRequestsWhatsApp(prefs: UserNotificationPrefs): boolean {
    return hasWhatsAppPhone(prefs) && prefs.whatsappNotifyRequests === true;
}

export function shouldSendAgendaWhatsApp(prefs: UserNotificationPrefs): boolean {
    return hasWhatsAppPhone(prefs) && prefs.whatsappNotifyAgenda === true;
}

export function shouldSendAccountWhatsApp(prefs: UserNotificationPrefs): boolean {
    return hasWhatsAppPhone(prefs) && prefs.whatsappNotifyAccount === true;
}

export function shouldSendSerenatasWhatsApp(
    prefs: UserNotificationPrefs,
    category?: 'invitation' | 'requests' | 'agenda' | 'account',
): boolean {
    if (category === 'invitation') return shouldSendInvitationWhatsApp(prefs);
    if (category === 'requests') return shouldSendRequestsWhatsApp(prefs);
    if (category === 'agenda') return shouldSendAgendaWhatsApp(prefs);
    if (category === 'account') return shouldSendAccountWhatsApp(prefs);
    return (
        shouldSendInvitationWhatsApp(prefs)
        || shouldSendRequestsWhatsApp(prefs)
        || shouldSendAgendaWhatsApp(prefs)
        || shouldSendAccountWhatsApp(prefs)
    );
}

export function shouldCreateInAppNotification(_prefs: UserNotificationPrefs | null | undefined): boolean {
    return true;
}

/** Horario silencioso WhatsApp Serenatas (Chile): 22:00–07:59. */
export function isSerenatasWhatsAppQuietHours(now = new Date()): boolean {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Santiago',
            hour: 'numeric',
            hour12: false,
        }).format(now),
    );
    return hour >= 22 || hour < 8;
}
