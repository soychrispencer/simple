import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaProfessionalProfiles, serenatas } from '../../db/schema.js';
import { resolveSerenataMessageParticipants } from './serenata-thread-participants.js';
import { findUserIdByEmail } from './message-thread-context.js';

export type ContextConversationAuth =
    | {
        ok: true;
        vertical: 'agenda' | 'serenatas';
        contextType: 'agenda_appointment' | 'serenata';
        contextId: string;
        ownerUserId: string;
        buyerUserId: string;
        senderUserId: string;
        senderRole: 'buyer' | 'seller';
    }
    | { ok: false; error: string; status: number };

export async function authorizeContextConversation(input: {
    userId: string;
    contextType: 'agenda_appointment' | 'serenata';
    contextId: string;
}): Promise<ContextConversationAuth> {
    if (input.contextType === 'agenda_appointment') {
        const appointment = await db.query.agendaAppointments.findFirst({
            where: eq(agendaAppointments.id, input.contextId),
        });
        if (!appointment) {
            return { ok: false, error: 'Cita no encontrada.', status: 404 };
        }
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.id, appointment.professionalId),
            columns: { userId: true },
        });
        if (!profile) {
            return { ok: false, error: 'Profesional no encontrado.', status: 404 };
        }
        const buyerUserId = appointment.clientEmail
            ? await findUserIdByEmail(appointment.clientEmail)
            : null;
        if (!buyerUserId) {
            return {
                ok: false,
                error: 'El paciente aún no tiene cuenta en Simple Agenda. Pídele que se registre con el mismo correo de la reserva.',
                status: 409,
            };
        }
        const ownerUserId = profile.userId;
        if (input.userId === ownerUserId) {
            return {
                ok: true,
                vertical: 'agenda',
                contextType: 'agenda_appointment',
                contextId: input.contextId,
                ownerUserId,
                buyerUserId,
                senderUserId: input.userId,
                senderRole: 'seller',
            };
        }
        if (input.userId === buyerUserId) {
            return {
                ok: true,
                vertical: 'agenda',
                contextType: 'agenda_appointment',
                contextId: input.contextId,
                ownerUserId,
                buyerUserId,
                senderUserId: input.userId,
                senderRole: 'buyer',
            };
        }
        return { ok: false, error: 'No autorizado.', status: 403 };
    }

    const serenata = await db.query.serenatas.findFirst({
        where: eq(serenatas.id, input.contextId),
    });
    if (!serenata) {
        return { ok: false, error: 'Solicitud no encontrada.', status: 404 };
    }
    const participants = await resolveSerenataMessageParticipants(serenata);
    if (!participants) {
        return { ok: false, error: 'Esta solicitud aún no tiene participantes de mensajería.', status: 409 };
    }
    if (input.userId === participants.ownerUserId) {
        return {
            ok: true,
            vertical: 'serenatas',
            contextType: 'serenata',
            contextId: input.contextId,
            ownerUserId: participants.ownerUserId,
            buyerUserId: participants.buyerUserId,
            senderUserId: input.userId,
            senderRole: 'seller',
        };
    }
    if (input.userId === participants.buyerUserId) {
        return {
            ok: true,
            vertical: 'serenatas',
            contextType: 'serenata',
            contextId: input.contextId,
            ownerUserId: participants.ownerUserId,
            buyerUserId: participants.buyerUserId,
            senderUserId: input.userId,
            senderRole: 'buyer',
        };
    }
    return { ok: false, error: 'No autorizado.', status: 403 };
}
