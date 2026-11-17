import cron from 'node-cron';
import { and, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accountRelationshipTasks, platformNotifications } from '../../db/schema.js';
import { createAccountNotificationRecipientResolver, insertPlatformNotifications } from './notifications-service.js';

const RELATIONSHIP_TASK_CRON_LOCK_KEY = 839_203;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

async function sendUpcomingTaskReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);
    await db.transaction(async (tx) => {
        const lockResult = await tx.execute(
            sql`SELECT pg_try_advisory_xact_lock(${RELATIONSHIP_TASK_CRON_LOCK_KEY}) AS acquired`,
        );
        const lockRow = (lockResult as { rows?: Array<{ acquired?: boolean }> }).rows?.[0];
        if (lockRow?.acquired !== true) return;

        const tasks = await tx.select({
            id: accountRelationshipTasks.id,
            accountId: accountRelationshipTasks.accountId,
            vertical: accountRelationshipTasks.vertical,
            personId: accountRelationshipTasks.personId,
            title: accountRelationshipTasks.title,
            assignedUserId: accountRelationshipTasks.assignedUserId,
            createdByUserId: accountRelationshipTasks.createdByUserId,
            dueAt: accountRelationshipTasks.dueAt,
        })
            .from(accountRelationshipTasks)
            .where(and(
                inArray(accountRelationshipTasks.vertical, ['autos', 'propiedades']),
                eq(accountRelationshipTasks.status, 'open'),
                isNotNull(accountRelationshipTasks.dueAt),
                isNull(accountRelationshipTasks.reminderSentAt),
                gte(accountRelationshipTasks.dueAt, now),
                lte(accountRelationshipTasks.dueAt, windowEnd),
            ))
            .orderBy(accountRelationshipTasks.dueAt)
            .limit(250);

        let sentCount = 0;
        const resolveRecipient = createAccountNotificationRecipientResolver(tx);
        for (const task of tasks) {
            if (!task.dueAt) continue;
            const recipientUserId = await resolveRecipient(
                task.accountId,
                [task.assignedUserId, task.createdByUserId],
            );
            if (!recipientUserId) continue;
            const [currentTask] = await tx.select({
                id: accountRelationshipTasks.id,
                accountId: accountRelationshipTasks.accountId,
                personId: accountRelationshipTasks.personId,
                title: accountRelationshipTasks.title,
                assignedUserId: accountRelationshipTasks.assignedUserId,
                createdByUserId: accountRelationshipTasks.createdByUserId,
                dueAt: accountRelationshipTasks.dueAt,
            })
                .from(accountRelationshipTasks)
                .where(and(
                    eq(accountRelationshipTasks.id, task.id),
                    eq(accountRelationshipTasks.accountId, task.accountId),
                    eq(accountRelationshipTasks.vertical, task.vertical),
                    eq(accountRelationshipTasks.status, 'open'),
                    isNotNull(accountRelationshipTasks.dueAt),
                    isNull(accountRelationshipTasks.reminderSentAt),
                    gte(accountRelationshipTasks.dueAt, now),
                    lte(accountRelationshipTasks.dueAt, windowEnd),
                ))
                .limit(1)
                .for('update');
            if (!currentTask?.dueAt
                || currentTask.assignedUserId !== task.assignedUserId
                || currentTask.createdByUserId !== task.createdByUserId
                || currentTask.title !== task.title
                || currentTask.personId !== task.personId
                || currentTask.dueAt.getTime() !== task.dueAt?.getTime()) {
                continue;
            }
            const dueAt = task.dueAt.toISOString();
            const existing = await tx.select({ id: platformNotifications.id })
                .from(platformNotifications)
                .where(and(
                    eq(platformNotifications.userId, recipientUserId),
                    eq(platformNotifications.vertical, task.vertical),
                    eq(platformNotifications.type, 'relationship_task.reminder'),
                    eq(platformNotifications.entityType, 'relationship_task'),
                    eq(platformNotifications.entityId, task.id),
                    sql`${platformNotifications.metadata}->>'dueAt' = ${dueAt}`,
                ))
                .limit(1);

            if (!existing[0]) {
                const inserted = await insertPlatformNotifications({
                    userId: recipientUserId,
                    vertical: task.vertical as 'autos' | 'propiedades',
                    type: 'relationship_task.reminder',
                    title: 'Tienes un próximo paso pendiente',
                    body: `${task.title} vence dentro de las próximas 24 horas.`,
                    actionUrl: `/panel/contactos?contacto=${encodeURIComponent(task.personId)}`,
                    entityType: 'relationship_task',
                    entityId: task.id,
                    metadata: {
                        taskId: task.id,
                        accountId: task.accountId,
                        personId: task.personId,
                        dueAt,
                    },
                }, { tx });
                if (inserted === 0) continue;
                sentCount += 1;
            }

            await tx.update(accountRelationshipTasks)
                .set({ reminderSentAt: now, updatedAt: now })
                .where(and(
                    eq(accountRelationshipTasks.id, task.id),
                    isNull(accountRelationshipTasks.reminderSentAt),
                ));
        }

        if (sentCount > 0) {
            console.info(`[relationship-reminders] avisos creados: ${sentCount}`);
        }
    });
}

export function registerRelationshipTaskReminderCron(): void {
    if (process.env.SIMPLE_RELATIONSHIP_TASK_REMINDERS_ENABLED === 'false') {
        console.info('[relationship-reminders] cron desactivado por configuración');
        return;
    }

    cron.schedule('*/15 * * * *', async () => {
        try {
            await sendUpcomingTaskReminders();
        } catch (error) {
            console.error('[relationship-reminders] no se pudieron revisar los próximos pasos', error);
        }
    });
    console.info('[relationship-reminders] recordatorios internos programados');
}
