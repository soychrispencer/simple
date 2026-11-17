import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
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

export function createAgendaPropertyVisitCalendarSync(deps: {
    db: any;
    agendaProfessionalProfiles: any;
}) {
    const { db, agendaProfessionalProfiles } = deps;

    async function calendarForUser(userId: string, accountId: string) {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: and(
                eq(agendaProfessionalProfiles.userId, userId),
                eq(agendaProfessionalProfiles.accountId, accountId),
            ),
        });
        if (!profile?.googleAccessToken || !profile.googleCalendarId) return null;

        const oauth2Client = getGoogleOAuth2Client('/api/agenda/google-calendar/callback');
        oauth2Client.setCredentials({
            access_token: profile.googleAccessToken,
            refresh_token: profile.googleRefreshToken ?? undefined,
            expiry_date: profile.googleTokenExpiry?.getTime(),
        });
        return {
            calendarId: profile.googleCalendarId as string,
            api: google.calendar({ version: 'v3', auth: oauth2Client }),
        };
    }

    async function deleteEvent(eventId: string, ownerUserId: string, accountId: string): Promise<boolean> {
        const calendar = await calendarForUser(ownerUserId, accountId);
        if (!calendar) return false;
        try {
            await calendar.api.events.delete({ calendarId: calendar.calendarId, eventId });
            return true;
        } catch (error) {
            const code = error && typeof error === 'object'
                ? Number((error as { code?: unknown; status?: unknown }).code ?? (error as { status?: unknown }).status)
                : 0;
            return code === 404 || code === 410;
        }
    }

    return async function syncPropertyVisitCalendar(input: {
        visit: {
            id: string;
            accountId: string;
            visitType: string;
            startsAt: Date;
            durationMinutes: number;
            contactName: string;
            location: string | null;
            googleEventId: string | null;
            googleCalendarOwnerUserId: string | null;
        };
        listingTitle: string | null;
        targetUserId: string | null;
        action: 'upsert' | 'delete';
    }): Promise<{
        ok: boolean;
        eventId: string | null;
        ownerUserId: string | null;
        connected: boolean;
    }> {
        const oldEventId = input.visit.googleEventId ?? null;
        const oldOwnerUserId = input.visit.googleCalendarOwnerUserId ?? null;
        const deleteOldEvent = async () => {
            if (!oldEventId || !oldOwnerUserId) return true;
            return deleteEvent(oldEventId, oldOwnerUserId, input.visit.accountId);
        };

        if (input.action === 'delete' || !input.targetUserId) {
            const deleted = await deleteOldEvent();
            return {
                ok: deleted,
                eventId: deleted ? null : oldEventId,
                ownerUserId: deleted ? null : oldOwnerUserId,
                connected: false,
            };
        }

        const targetCalendar = await calendarForUser(input.targetUserId, input.visit.accountId);
        if (!targetCalendar) {
            const deleted = await deleteOldEvent();
            return {
                ok: deleted,
                eventId: deleted ? null : oldEventId,
                ownerUserId: deleted ? null : oldOwnerUserId,
                connected: false,
            };
        }

        let eventId = oldEventId;
        if (oldEventId && oldOwnerUserId !== input.targetUserId) {
            const deleted = await deleteOldEvent();
            if (!deleted) {
                return { ok: false, eventId: oldEventId, ownerUserId: oldOwnerUserId, connected: true };
            }
            eventId = null;
        }

        const endsAt = new Date(input.visit.startsAt.getTime() + input.visit.durationMinutes * 60_000);
        const eventTypeLabel = input.visit.visitType === 'brokerage_meeting'
            ? 'Reunión comercial'
            : 'Visita inmobiliaria';
        const resource = {
            summary: `${eventTypeLabel} · ${input.listingTitle || input.visit.contactName}`,
            description: 'Contacto: ' + input.visit.contactName,
            start: { dateTime: input.visit.startsAt.toISOString() },
            end: { dateTime: endsAt.toISOString() },
            ...(input.visit.location ? { location: input.visit.location } : {}),
            transparency: 'opaque',
        };

        try {
            if (eventId) {
                try {
                    await targetCalendar.api.events.update({
                        calendarId: targetCalendar.calendarId,
                        eventId,
                        requestBody: resource,
                        sendUpdates: 'none',
                    });
                    return { ok: true, eventId, ownerUserId: input.targetUserId, connected: true };
                } catch (error) {
                    const code = error && typeof error === 'object'
                        ? Number((error as { code?: unknown; status?: unknown }).code ?? (error as { status?: unknown }).status)
                        : 0;
                    if (code !== 404 && code !== 410) throw error;
                }
            }

            const created = await targetCalendar.api.events.insert({
                calendarId: targetCalendar.calendarId,
                requestBody: resource,
                sendUpdates: 'none',
            });
            const createdEventId = created.data.id ?? null;
            return {
                ok: Boolean(createdEventId),
                eventId: createdEventId,
                ownerUserId: createdEventId ? input.targetUserId : null,
                connected: true,
            };
        } catch {
            return { ok: false, eventId: oldEventId, ownerUserId: oldOwnerUserId, connected: true };
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
