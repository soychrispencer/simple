const STORAGE_KEY = 'serenatas-email-notification-prefs';

export type EmailNotificationPrefs = {
    invitations: boolean;
    agenda: boolean;
    account: boolean;
};

const DEFAULT_PREFS: EmailNotificationPrefs = {
    invitations: true,
    agenda: true,
    account: true,
};

export function readEmailNotificationPrefs(): EmailNotificationPrefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PREFS;
        const parsed = JSON.parse(raw) as Partial<EmailNotificationPrefs>;
        return {
            invitations: parsed.invitations ?? DEFAULT_PREFS.invitations,
            agenda: parsed.agenda ?? DEFAULT_PREFS.agenda,
            account: parsed.account ?? DEFAULT_PREFS.account,
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

export function writeEmailNotificationPrefs(prefs: EmailNotificationPrefs): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
