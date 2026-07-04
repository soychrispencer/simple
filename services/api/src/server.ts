import path from 'node:path';
import { serve } from '@hono/node-server';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env, isProduction } from './env.js';
import { logger } from '@simple/logger';
import { applyPostJournalMigrations } from './db/apply-post-journal-migrations.js';
import { db, pgClient } from './db/index.js';
import { warmEmailLogoCache } from './lib/email-brand-logo.js';
import { registerAgendaCronJobs } from './modules/agenda/cron.js';
import { registerSerenatasCronJobs } from './modules/serenatas/cron.js';
import { loadDataFromDB } from './index.js';
import { refreshValuationFeeds } from './modules/valuation/index.js';
import { refreshVehicleValuationFeeds } from './modules/vehicle-valuation/index.js';
import { warnMercadoPagoWebhookSecretAtStartup } from './modules/mercadopago/service.js';
import { app } from './index.js';

const API_ROOT_DIR = path.resolve(__dirname, '..');

const port = env.PORT;
const hostname = env.API_HOST;
void refreshValuationFeeds();
void refreshVehicleValuationFeeds();

// Run DB migrations, register jobs, preload data, then start the HTTP server
(async () => {
    try {
        const migrationsFolder = path.resolve(__dirname, '../drizzle');
        await migrate(db, { migrationsFolder });
        console.info('[simple-api] DB migrations checked');
    } catch (error) {
        console.error('[simple-api] DB migration failed', error);
        if (!isProduction) {
            logger.warn(
                '[simple-api] En local: ejecuta `pnpm run db:migrate` en services/api y revisa que .env.local y esta app usen la MISMA DATABASE_URL (orden .env→.env.local).'
            );
        }
    }

    try {
        const postJournal = await applyPostJournalMigrations(pgClient, {
            migrationsFolder: path.resolve(API_ROOT_DIR, 'drizzle'),
            log: (message) => {
                if (message.startsWith('  ya aplicado:')) return;
                console.info(`[simple-api] post-journal ${message}`);
            },
        });
        if (postJournal.appliedNow > 0) {
            console.info(`[simple-api] post-journal: ${postJournal.appliedNow} migración(es) aplicadas`);
        }
    } catch (error) {
        console.warn('[simple-api] post-journal migrations skipped or failed (non-blocking)', error);
    }

    registerAgendaCronJobs();
    registerSerenatasCronJobs();

    try {
        await loadDataFromDB();
    } catch (error) {
        console.error('[simple-api] failed to preload DB data', error);
    }

    try {
        await warmEmailLogoCache();
        console.info('[auth-email] logos PNG listos para correo');
    } catch (error) {
        console.warn('[auth-email] no se pudieron rasterizar logos de correo', error);
    }

    warnMercadoPagoWebhookSecretAtStartup();

    serve(
        {
            fetch: app.fetch,
            hostname,
            port,
            maxRequestBodySize: 50 * 1024 * 1024, // 50MB for video uploads
        },
        (info) => {
            console.info(`[simple-api] listening on http://${hostname}:${info.port}`);
        }
    );
})();
