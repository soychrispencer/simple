import cron from 'node-cron';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { isProduction } from '../../env.js';
import { runPendingSerenataLifecycle } from './lifecycle.js';

/** Advisory lock PostgreSQL: solo una réplica API ejecuta jobs de serenatas a la vez. */
const SERENATAS_CRON_ADVISORY_LOCK_KEY = 839_202;

async function tryAcquireSerenatasCronLock(): Promise<boolean> {
    try {
        const result = await db.execute(
            sql`SELECT pg_try_advisory_lock(${SERENATAS_CRON_ADVISORY_LOCK_KEY}) AS acquired`,
        );
        const row = (result as { rows?: Array<{ acquired?: boolean }> }).rows?.[0];
        return row?.acquired === true;
    } catch {
        return true;
    }
}

async function releaseSerenatasCronLock(): Promise<void> {
    try {
        await db.execute(sql`SELECT pg_advisory_unlock(${SERENATAS_CRON_ADVISORY_LOCK_KEY})`);
    } catch {
        // ignore
    }
}

export function registerSerenatasCronJobs() {
    const serenatasEnabled = process.env.SERENATAS_CRON_ENABLED === 'true';

    if (!isProduction && !serenatasEnabled) {
        console.info('[serenatas] cron jobs desactivados (no es producción y SERENATAS_CRON_ENABLED != true)');
        return;
    }

    if (isProduction && serenatasEnabled) {
        console.info('[serenatas] SERENATAS_CRON_ENABLED=true en producción — preferir una sola réplica con cron');
    }

    console.info('[serenatas] registering lifecycle cron (advisory lock %s)...', SERENATAS_CRON_ADVISORY_LOCK_KEY);

    const runWithLock = async (job: () => Promise<void>) => {
        const acquired = await tryAcquireSerenatasCronLock();
        if (!acquired) return;
        try {
            await job();
        } finally {
            await releaseSerenatasCronLock();
        }
    };

    cron.schedule('*/5 * * * *', async () => {
        await runWithLock(async () => {
            try {
                await runPendingSerenataLifecycle();
            } catch (e) {
                console.error('[serenatas] lifecycle cron error:', e);
            }
        });
    });
}
