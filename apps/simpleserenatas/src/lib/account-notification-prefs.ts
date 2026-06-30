import type { SerenatasUser } from '@/lib/serenatas-api';
import type { Profiles } from '@/lib/serenatas-api';

/** Modo de panel: cliente contrata serenatas; trabajo = músico o dueño. */
export type NotificationPrefsAppMode = 'client' | 'work';

function isOwnerProfile(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}

export type NotificationPrefsSnapshot = {
    categoryPrefs: CategoryNotificationPrefs;
};

export type CategoryChannelPrefs = {
    email: boolean;
};

export type CategoryNotificationPrefs = Record<NotificationCategory, CategoryChannelPrefs>;

export const DEFAULT_CATEGORY_NOTIFICATION_PREFS: CategoryNotificationPrefs = {
    invitations: { email: true },
    requests: { email: true },
    agenda: { email: true },
    account: { email: true },
};

export type NotificationCategory = 'invitations' | 'requests' | 'agenda' | 'account';

export function categoryNotificationPrefsFromUser(
    user: SerenatasUser | null | undefined,
): CategoryNotificationPrefs {
    if (!user) return DEFAULT_CATEGORY_NOTIFICATION_PREFS;
    return {
        invitations: {
            email: user.emailNotifyInvitations ?? true,
        },
        requests: {
            email: user.emailNotifyRequests ?? user.emailNotifyAgenda ?? true,
        },
        agenda: {
            email: user.emailNotifyAgenda ?? true,
        },
        account: {
            email: user.emailNotifyAccount ?? true,
        },
    };
}

export function notificationPrefsSnapshotFromUser(user: SerenatasUser | null | undefined): NotificationPrefsSnapshot {
    return {
        categoryPrefs: categoryNotificationPrefsFromUser(user),
    };
}

export function notificationPrefsSnapshotsEqual(a: NotificationPrefsSnapshot, b: NotificationPrefsSnapshot): boolean {
    const categories: NotificationCategory[] = ['invitations', 'requests', 'agenda', 'account'];
    for (const key of categories) {
        if (a.categoryPrefs[key].email !== b.categoryPrefs[key].email) return false;
    }
    return true;
}

export function notificationPrefsToApiPayload(
    snapshot: NotificationPrefsSnapshot,
    phone?: string,
    inAppNotificationsEnabled = true,
) {
    const { categoryPrefs } = snapshot;
    return {
        emailNotifyInvitations: categoryPrefs.invitations.email,
        emailNotifyRequests: categoryPrefs.requests.email,
        emailNotifyAgenda: categoryPrefs.agenda.email,
        emailNotifyAccount: categoryPrefs.account.email,
        inAppNotificationsEnabled,
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
    };
}

export type NotificationCategoryRowConfig = {
    key: NotificationCategory;
    label: string;
    hint?: string;
};

const OWNER_REQUESTS_HINT =
    'Correo al operador: nueva solicitud pagada, recordatorio de plazo para responder y cancelación del cliente.';
const OWNER_AGENDA_HINT =
    'Correo al operador: recordatorio para cerrar una serenata ya realizada (marcar completada o cancelada).';
const CLIENT_SERENATAS_HINT =
    'Correo: pago pendiente, aceptación o rechazo y otros cambios de estado de tu solicitud.';
const CLIENT_AGENDA_HINT = 'Correo el día del evento si tu serenata está programada para hoy.';

export function getOwnerBusinessNotificationRows(): NotificationCategoryRowConfig[] {
    return [
        { key: 'requests', label: 'Solicitudes de clientes', hint: OWNER_REQUESTS_HINT },
        {
            key: 'agenda',
            label: 'Cierre de serenatas',
            hint: OWNER_AGENDA_HINT,
        },
    ];
}

/** Filas de preferencias según modo y perfiles (cliente / músico / dueño). */
export function getNotificationCategoryRowsForContext(
    mode: NotificationPrefsAppMode,
    profiles: Profiles,
): NotificationCategoryRowConfig[] {
    const rows: NotificationCategoryRowConfig[] = [];
    const isOwner = isOwnerProfile(profiles);

    if (mode === 'work' && profiles.musician) {
        rows.push({
            key: 'invitations',
            label: 'Invitaciones a grupos',
            hint: isOwner
                ? 'Solo cuando te invitan a integrar un grupo como músico.'
                : 'Correo cuando te invitan a un grupo.',
        });
    }

    if (mode === 'client') {
        rows.push({ key: 'requests', label: 'Mis serenatas', hint: CLIENT_SERENATAS_HINT });
        rows.push({ key: 'agenda', label: 'Día del evento', hint: CLIENT_AGENDA_HINT });
    }

    return rows;
}

function categoryLabelForContext(
    category: NotificationCategory,
    mode: NotificationPrefsAppMode,
    profiles: Profiles,
): string {
    const row = getNotificationCategoryRowsForContext(mode, profiles).find((r) => r.key === category);
    if (row) return row.label;
    if (category === 'invitations') return 'Invitaciones a grupos';
    if (category === 'requests') return 'Solicitudes';
    if (category === 'account') return 'Avisos de cuenta';
    return 'Agenda';
}

/** Mensaje breve según qué cambió al guardar preferencias. */
export function buildNotificationSaveMessage(
    before: NotificationPrefsSnapshot,
    after: NotificationPrefsSnapshot,
    context?: { mode: NotificationPrefsAppMode; profiles: Profiles },
): string {
    const parts: string[] = [];
    const categories: NotificationCategory[] = context
        ? getNotificationCategoryRowsForContext(context.mode, context.profiles).map((r) => r.key)
        : ['invitations', 'requests', 'agenda', 'account'];

    for (const key of categories) {
        const label = context
            ? categoryLabelForContext(key, context.mode, context.profiles)
            : key;
        if (before.categoryPrefs[key].email !== after.categoryPrefs[key].email) {
            parts.push(
                after.categoryPrefs[key].email
                    ? `${label}: correo activado`
                    : `${label}: correo desactivado`,
            );
        }
    }

    if (parts.length === 0) return 'Preferencias guardadas.';
    if (parts.length === 1) return `Guardado: ${parts[0]}.`;
    const head = parts.slice(0, -1).join(', ');
    return `Guardado: ${head} y ${parts[parts.length - 1]}.`;
}
