import type { MessageSenderRole } from './row-mappers.js';
import type { MessageServiceDeps } from './service.js';
import {
    createContextMessageThread,
    createMessageEntry,
    getMessageThreadByContext,
    touchMessageThreadAfterIncomingMessage,
} from './service.js';
import { resolveMessageThreadListingDisplay } from './message-thread-context.js';
import { notifyMessageThreadActivity } from './thread-notifications.js';
import { resolveSerenataMessageParticipants } from './serenata-thread-participants.js';
import { getMinimalMessageServiceDeps } from './message-service-factory.js';
import { publicSectionLabel } from '../../lib/format-relative.js';
import type { BoostSection } from '../../lib/domain-types.js';

async function contextTitleForThread(
    deps: MessageServiceDeps,
    thread: Awaited<ReturnType<typeof createContextMessageThread>>,
): Promise<string> {
    const display = await resolveMessageThreadListingDisplay(thread, deps.listingsById, (section) =>
        publicSectionLabel(section as BoostSection),
    );
    return display?.title ?? 'tu conversación';
}

async function notifyContextThreadMessage(
    deps: MessageServiceDeps,
    thread: Awaited<ReturnType<typeof createContextMessageThread>>,
    senderUserId: string,
    preview: string,
    isNewThread: boolean,
): Promise<void> {
    const recipientUserId = senderUserId === thread.ownerUserId
        ? thread.buyerUserId
        : thread.ownerUserId;
    const contextTitle = await contextTitleForThread(deps, thread);
    await notifyMessageThreadActivity({
        recipientUserId,
        vertical: thread.vertical,
        threadId: thread.id,
        senderUserId,
        contextTitle,
        preview,
        isNewThread,
    });
}

export async function appendOrCreateContextMessage(
    deps: MessageServiceDeps,
    input: {
        vertical: string;
        contextType: string;
        contextId: string;
        ownerUserId: string;
        buyerUserId: string;
        senderUserId: string;
        senderRole: MessageSenderRole;
        body: string;
    },
) {
    const trimmed = input.body.trim();
    if (!trimmed) {
        throw new Error('El mensaje no puede estar vacío.');
    }
    if (input.senderUserId !== input.ownerUserId && input.senderUserId !== input.buyerUserId) {
        throw new Error('No autorizado.');
    }

    const now = Date.now();
    const existing = await getMessageThreadByContext(
        deps,
        input.contextType,
        input.contextId,
        input.buyerUserId,
    );

    if (existing) {
        const entry = await createMessageEntry(deps, {
            threadId: existing.id,
            senderUserId: input.senderUserId,
            senderRole: input.senderRole,
            body: trimmed,
            createdAt: now,
        });
        const thread = await touchMessageThreadAfterIncomingMessage(deps, existing, input.senderRole, now);
        void notifyContextThreadMessage(deps, thread, input.senderUserId, trimmed, false);
        return { thread, entry, createdThread: false as const };
    }

    const thread = await createContextMessageThread(deps, {
        vertical: input.vertical,
        contextType: input.contextType,
        contextId: input.contextId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        ownerUnreadCount: input.senderRole === 'buyer' ? 1 : 0,
        buyerUnreadCount: input.senderRole === 'seller' ? 1 : 0,
        lastMessageAt: now,
    });
    const entry = await createMessageEntry(deps, {
        threadId: thread.id,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        body: trimmed,
        createdAt: now,
    });
    void notifyContextThreadMessage(deps, thread, input.senderUserId, trimmed, true);
    return { thread, entry, createdThread: true as const };
}

export async function ensureSerenataMessageThread(
    deps: MessageServiceDeps,
    input: {
        serenataId: string;
        ownerUserId: string;
        buyerUserId: string;
        initialMessage?: string | null;
    },
) {
    if (!input.initialMessage?.trim()) {
        const existing = await getMessageThreadByContext(deps, 'serenata', input.serenataId, input.buyerUserId);
        return existing;
    }

    return appendOrCreateContextMessage(deps, {
        vertical: 'serenatas',
        contextType: 'serenata',
        contextId: input.serenataId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        senderUserId: input.buyerUserId,
        senderRole: 'buyer',
        body: input.initialMessage,
    }).then((result) => result.thread);
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
    if (!input.initialMessage?.trim()) {
        const existing = await getMessageThreadByContext(
            deps,
            'agenda_appointment',
            input.appointmentId,
            input.buyerUserId,
        );
        return existing;
    }

    return appendOrCreateContextMessage(deps, {
        vertical: 'agenda',
        contextType: 'agenda_appointment',
        contextId: input.appointmentId,
        ownerUserId: input.professionalUserId,
        buyerUserId: input.buyerUserId,
        senderUserId: input.buyerUserId,
        senderRole: 'buyer',
        body: input.initialMessage,
    }).then((result) => result.thread);
}

export function scheduleSerenataMessageThread(serenata: {
    id: string;
    ownerId: string | null;
    clientId: string | null;
    providerGroupId: string | null;
    message?: string | null;
}): void {
    void (async () => {
        try {
            const participants = await resolveSerenataMessageParticipants(serenata);
            if (!participants) return;
            const deps = getMinimalMessageServiceDeps();
            await ensureSerenataMessageThread(deps, {
                serenataId: serenata.id,
                ownerUserId: participants.ownerUserId,
                buyerUserId: participants.buyerUserId,
                initialMessage: serenata.message ?? null,
            });
        } catch (error) {
            console.error('[serenatas] No se pudo crear el hilo de mensajes:', error);
        }
    })();
}
