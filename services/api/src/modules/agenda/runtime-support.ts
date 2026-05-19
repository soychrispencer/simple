import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { getGoogleOAuth2Client } from '../../lib/google-auth.js';

export const AGENDA_RESERVED_SLUGS = new Set([
    'panel', 'auth', 'api', 'admin', 'login', 'register', 'logout',
    'settings', 'configuracion', 'perfil', 'profile', 'cuenta', 'account',
    'help', 'soporte', 'support', 'terms', 'privacy', 'legal',
    'blog', 'pricing', 'planes', 'home', 'about', 'nosotros',
    'app', 'dashboard', 'agenda', 'citas', 'reservas', 'booking',
    'www', 'mail', 'email', 'ftp', 'cdn', 'static', 'assets',
]);

export function isValidAgendaSlug(slug: string): { ok: true } | { ok: false; error: string } {
    if (!slug || slug.length < 3) return { ok: false, error: 'El link debe tener al menos 3 caracteres.' };
    if (slug.length > 60) return { ok: false, error: 'El link no puede tener más de 60 caracteres.' };
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
        return { ok: false, error: 'Solo letras minúsculas, números y guiones. No puede empezar ni terminar con guion.' };
    }
    if (/--/.test(slug)) return { ok: false, error: 'No puede contener guiones consecutivos.' };
    if (AGENDA_RESERVED_SLUGS.has(slug)) return { ok: false, error: 'Este link no está disponible.' };
    return { ok: true };
}

export function createAgendaPushSender(deps: {
    db: any;
    pushSubscriptions: any;
    webpush: any;
    vapidPublicKey: string | undefined;
    vapidPrivateKey: string | undefined;
}) {
    const { db, pushSubscriptions, webpush, vapidPublicKey, vapidPrivateKey } = deps;

    return async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
        if (!vapidPublicKey || !vapidPrivateKey) return;
        const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
        await Promise.allSettled(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify(payload),
                );
            } catch (e: unknown) {
                if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 410) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                }
            }
        }));
    };
}

export function createAgendaGoogleCalendarSync(deps: { db: any; agendaAppointments: any }) {
    const { db, agendaAppointments } = deps;

    return async function syncToGoogleCalendar(
        profile: {
            googleAccessToken: string | null;
            googleRefreshToken: string | null;
            googleTokenExpiry: Date | null;
            googleCalendarId: string | null;
            displayName: string | null;
        },
        appointment: {
            id: string;
            startsAt: Date;
            endsAt: Date;
            clientName: string | null;
            clientEmail: string | null;
            internalNotes: string | null;
            googleEventId: string | null;
            modality: string | null;
        },
        action: 'create' | 'update' | 'delete',
    ): Promise<{ eventId: string | null; meetingUrl: string | null } | null> {
        if (!profile.googleAccessToken || !profile.googleCalendarId) return null;
        try {
            const oauth2Client = getGoogleOAuth2Client('/api/agenda/google-calendar/callback');
            oauth2Client.setCredentials({
                access_token: profile.googleAccessToken,
                refresh_token: profile.googleRefreshToken ?? undefined,
                expiry_date: profile.googleTokenExpiry?.getTime(),
            });
            const calApi = google.calendar({ version: 'v3', auth: oauth2Client });

            if (action === 'delete') {
                if (!appointment.googleEventId) return null;
                await calApi.events.delete({ calendarId: profile.googleCalendarId, eventId: appointment.googleEventId }).catch(() => null);
                return { eventId: null, meetingUrl: null };
            }

            const isOnline = appointment.modality === 'online';
            const resource: Record<string, unknown> = {
                summary: appointment.clientName ? `Sesión con ${appointment.clientName}` : 'Sesión',
                description: appointment.internalNotes ?? undefined,
                start: { dateTime: appointment.startsAt.toISOString() },
                end: { dateTime: appointment.endsAt.toISOString() },
                attendees: appointment.clientEmail ? [{ email: appointment.clientEmail }] : undefined,
            };

            if (isOnline) {
                resource.conferenceData = {
                    createRequest: {
                        requestId: appointment.id,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                };
            }

            let eventId: string | null = null;
            let meetingUrl: string | null = null;

            if (!appointment.googleEventId) {
                const res = await calApi.events.insert({
                    calendarId: profile.googleCalendarId,
                    requestBody: resource,
                    conferenceDataVersion: 1,
                    sendUpdates: 'none',
                });
                eventId = res.data.id ?? null;
                meetingUrl = res.data.conferenceData?.entryPoints?.[0]?.uri ?? null;
            } else {
                const res = await calApi.events.update({
                    calendarId: profile.googleCalendarId,
                    eventId: appointment.googleEventId,
                    requestBody: resource,
                    conferenceDataVersion: 1,
                    sendUpdates: 'none',
                });
                eventId = appointment.googleEventId;
                meetingUrl = res.data.conferenceData?.entryPoints?.[0]?.uri ?? null;
            }

            if (isOnline && meetingUrl) {
                await db.update(agendaAppointments).set({ meetingUrl }).where(eq(agendaAppointments.id, appointment.id));
            }

            return { eventId, meetingUrl };
        } catch {
            return null;
        }
    };
}

export function createEnsureNpsForAppointment(deps: { db: any; agendaNpsResponses: any }) {
    const { db, agendaNpsResponses } = deps;

    return async function ensureNpsForAppointment(
        professionalId: string,
        appointmentId: string,
        clientId: string | null,
    ): Promise<{ token: string } | null> {
        const existing = await db.query.agendaNpsResponses.findFirst({
            where: eq(agendaNpsResponses.appointmentId, appointmentId),
        });
        if (existing) return { token: existing.token };
        const token = randomBytes(24).toString('hex');
        const [created] = await db.insert(agendaNpsResponses).values({
            professionalId, appointmentId, clientId, token,
        }).returning();
        return created ? { token: created.token } : null;
    };
}
