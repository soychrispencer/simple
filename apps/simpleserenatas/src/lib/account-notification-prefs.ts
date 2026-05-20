import type { SerenatasUser } from '@/lib/serenatas-api';
import type { Profiles } from '@/lib/serenatas-api';
import { validateChileMobilePhone } from './chile-phone';

/** Modo de panel: cliente contrata serenatas; trabajo = músico o dueño. */
export type NotificationPrefsAppMode = 'client' | 'work';

function isOwnerProfile(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}

export type EmailDigestFrequency = 'off' | 'daily' | 'weekly';

export type NotificationCategory = 'invitations' | 'requests' | 'agenda' | 'account';

export type CategoryChannelPrefs = {
    email: boolean;
    whatsapp: boolean;
};

export type CategoryNotificationPrefs = Record<NotificationCategory, CategoryChannelPrefs>;

export const DEFAULT_CATEGORY_NOTIFICATION_PREFS: CategoryNotificationPrefs = {
    invitations: { email: true, whatsapp: false },
    requests: { email: true, whatsapp: false },
    agenda: { email: true, whatsapp: false },
    account: { email: true, whatsapp: false },
};

export type NotificationPrefsSnapshot = {
    emailDigestFrequency: EmailDigestFrequency;
    categoryPrefs: CategoryNotificationPrefs;
};

function whatsappFromUser(
    user: SerenatasUser,
    category: NotificationCategory,
): boolean {
    const legacy = user.whatsappEnabled === true;
    if (category === 'invitations') {
        return user.whatsappNotifyInvitations ?? legacy;
    }
    if (category === 'requests') {
        return user.whatsappNotifyRequests ?? legacy;
    }
    if (category === 'agenda') {
        return user.whatsappNotifyAgenda ?? legacy;
    }
    return user.whatsappNotifyAccount ?? false;
}

export function categoryNotificationPrefsFromUser(
    user: SerenatasUser | null | undefined,
): CategoryNotificationPrefs {
    if (!user) return DEFAULT_CATEGORY_NOTIFICATION_PREFS;
    return {
        invitations: {
            email: user.emailNotifyInvitations ?? true,
            whatsapp: whatsappFromUser(user, 'invitations'),
        },
        requests: {
            email: user.emailNotifyRequests ?? user.emailNotifyAgenda ?? true,
            whatsapp: whatsappFromUser(user, 'requests'),
        },
        agenda: {
            email: user.emailNotifyAgenda ?? true,
            whatsapp: whatsappFromUser(user, 'agenda'),
        },
        account: {
            email: user.emailNotifyAccount ?? true,
            whatsapp: whatsappFromUser(user, 'account'),
        },
    };
}

export function emailDigestFrequencyFromUser(user: SerenatasUser | null | undefined): EmailDigestFrequency {
    const value = user?.emailDigestFrequency;
    if (value === 'daily' || value === 'weekly') return value;
    return 'off';
}

export function notificationPrefsSnapshotFromUser(user: SerenatasUser | null | undefined): NotificationPrefsSnapshot {
    return {
        emailDigestFrequency: emailDigestFrequencyFromUser(user),
        categoryPrefs: categoryNotificationPrefsFromUser(user),
    };
}

export function notificationPrefsSnapshotsEqual(a: NotificationPrefsSnapshot, b: NotificationPrefsSnapshot): boolean {
    const categories: NotificationCategory[] = ['invitations', 'requests', 'agenda', 'account'];
    if (a.emailDigestFrequency !== b.emailDigestFrequency) return false;
    for (const key of categories) {
        if (a.categoryPrefs[key].email !== b.categoryPrefs[key].email) return false;
        if (a.categoryPrefs[key].whatsapp !== b.categoryPrefs[key].whatsapp) return false;
    }
    return true;
}

export function anyWhatsAppCategoryEnabled(prefs: CategoryNotificationPrefs): boolean {
    return (
        prefs.invitations.whatsapp
        || prefs.requests.whatsapp
        || prefs.agenda.whatsapp
        || prefs.account.whatsapp
    );
}

export function notificationPrefsToApiPayload(snapshot: NotificationPrefsSnapshot, phone?: string) {
    const { categoryPrefs } = snapshot;
    const whatsappEnabled = anyWhatsAppCategoryEnabled(categoryPrefs);
    return {
        emailNotifyInvitations: categoryPrefs.invitations.email,
        emailNotifyRequests: categoryPrefs.requests.email,
        emailNotifyAgenda: categoryPrefs.agenda.email,
        emailNotifyAccount: categoryPrefs.account.email,
        whatsappNotifyInvitations: categoryPrefs.invitations.whatsapp,
        whatsappNotifyRequests: categoryPrefs.requests.whatsapp,
        whatsappNotifyAgenda: categoryPrefs.agenda.whatsapp,
        whatsappNotifyAccount: categoryPrefs.account.whatsapp,
        whatsappEnabled,
        inAppNotificationsEnabled: true,
        emailDigestFrequency: snapshot.emailDigestFrequency,
        ...(whatsappEnabled && phone?.trim() ? { phone: phone.trim() } : {}),
    };
}

/** Valida teléfono cuando hay al menos un aviso por WhatsApp activo. */
export function whatsappPhoneValidation(categoryPrefs: CategoryNotificationPrefs, phone: string): string | null {
    if (!anyWhatsAppCategoryEnabled(categoryPrefs)) return null;
    const trimmed = phone.trim();
    if (!trimmed) return 'Ingresa un número de teléfono para recibir avisos por WhatsApp.';
    return validateChileMobilePhone(trimmed);
}

export type NotificationCategoryRowConfig = {
    key: NotificationCategory;
    label: string;
    hint?: string;
    /** Si false, no hay plantillas WhatsApp para esta categoría (solo correo). */
    whatsappAvailable?: boolean;
};

const OWNER_REQUESTS_HINT =
    'Correo/WhatsApp: nueva solicitud de cliente, recordatorio de plazo para responder y si el cliente cancela. La campana del panel siempre avisa.';
const OWNER_AGENDA_HINT =
    'Correo: recordatorio para cerrar una serenata ya realizada (marcar completada o cancelada).';
const CLIENT_SERENATAS_HINT =
    'Correo/WhatsApp: pago pendiente, aceptación o rechazo y otros cambios de estado de tu solicitud.';
const CLIENT_AGENDA_HINT = 'WhatsApp solo el día del evento si tu serenata está programada para hoy.';
const ACCOUNT_HINT =
    'Verificación de correo y restablecer contraseña siempre se envían. Este toggle controla bienvenida y avisos de seguridad opcionales (contraseña cambiada). La campana del panel no se puede desactivar.';
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
                : 'Correo/WhatsApp cuando te invitan a un grupo.',
        });
    }

    if (mode === 'client') {
        rows.push({ key: 'requests', label: 'Mis serenatas', hint: CLIENT_SERENATAS_HINT });
        rows.push({ key: 'agenda', label: 'Día del evento', hint: CLIENT_AGENDA_HINT });
    } else if (isOwner) {
        rows.push({ key: 'requests', label: 'Solicitudes de clientes', hint: OWNER_REQUESTS_HINT });
        rows.push({
            key: 'agenda',
            label: 'Cierre de serenatas',
            hint: OWNER_AGENDA_HINT,
            whatsappAvailable: false,
        });
    }

    rows.push({ key: 'account', label: 'Avisos de cuenta', hint: ACCOUNT_HINT, whatsappAvailable: false });
    return rows;
}

export function notificationPrefsContextDescription(
    mode: NotificationPrefsAppMode,
    profiles: Profiles,
): string {
    const isOwner = isOwnerProfile(profiles);
    if (mode === 'client') {
        return 'Elige qué avisos recibir sobre tus serenatas contratadas. La campana del panel siempre muestra novedades.';
    }
    if (isOwner && profiles.musician) {
        return 'Solicitudes y cierre de serenatas son de tu negocio; invitaciones a grupos, de tu perfil músico.';
    }
    if (isOwner) {
        return 'Solicitudes y agenda son independientes: una es el flujo de clientes, la otra el cierre de eventos.';
    }
    if (profiles.musician) {
        return 'Invitaciones a grupos por correo o WhatsApp; el resto de novedades en la campana del panel.';
    }
    return 'Configura correo y WhatsApp por tipo de aviso.';
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
        if (before.categoryPrefs[key].whatsapp !== after.categoryPrefs[key].whatsapp) {
            parts.push(
                after.categoryPrefs[key].whatsapp
                    ? `${label}: WhatsApp activado`
                    : `${label}: WhatsApp desactivado`,
            );
        }
    }

    if (parts.length === 0) return 'Preferencias guardadas.';
    if (parts.length === 1) return `Guardado: ${parts[0]}.`;
    const head = parts.slice(0, -1).join(', ');
    return `Guardado: ${head} y ${parts[parts.length - 1]}.`;
}
