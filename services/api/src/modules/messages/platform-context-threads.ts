import type { MessageServiceDeps } from './service.js';
import {
    createContextMessageThread,
    createMessageEntry,
    getMessageThreadByContext,
} from './service.js';

export async function ensureSerenataMessageThread(
    deps: MessageServiceDeps,
    input: {
        serenataId: string;
        ownerUserId: string;
        buyerUserId: string;
        initialMessage?: string | null;
    },
) {
    const existing = await getMessageThreadByContext(deps, 'serenata', input.serenataId, input.buyerUserId);
    if (existing) return existing;

    const now = Date.now();
    const thread = await createContextMessageThread(deps, {
        vertical: 'serenatas',
        contextType: 'serenata',
        contextId: input.serenataId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        ownerUnreadCount: input.initialMessage?.trim() ? 1 : 0,
        buyerUnreadCount: 0,
        lastMessageAt: now,
    });

    if (input.initialMessage?.trim()) {
        await createMessageEntry(deps, {
            threadId: thread.id,
            senderUserId: input.buyerUserId,
            senderRole: 'buyer',
            body: input.initialMessage.trim(),
            createdAt: now,
        });
    }

    return thread;
}

export async function ensureAgendaAppointmentMessageThread(
    deps: MessageServiceDeps,
    input: {
        appointmentId: string;
        professionalUserId: string;
        buyerUserId: string;
        initialMessage?: string | null;
    },
) {
    const existing = await getMessageThreadByContext(deps, 'agenda_appointment', input.appointmentId, input.buyerUserId);
    if (existing) return existing;

    const now = Date.now();
    const thread = await createContextMessageThread(deps, {
        vertical: 'agenda',
        contextType: 'agenda_appointment',
        contextId: input.appointmentId,
        ownerUserId: input.professionalUserId,
        buyerUserId: input.buyerUserId,
        ownerUnreadCount: input.initialMessage?.trim() ? 1 : 0,
        buyerUnreadCount: 0,
        lastMessageAt: now,
    });

    if (input.initialMessage?.trim()) {
        await createMessageEntry(deps, {
            threadId: thread.id,
            senderUserId: input.buyerUserId,
            senderRole: 'buyer',
            body: input.initialMessage.trim(),
            createdAt: now,
        });
    }

    return thread;
}
