import { env } from '../env.js';
import { isInstagramConfigured } from '../modules/instagram/service.js';
import { isMercadoPagoConfigured } from '../modules/mercadopago/service.js';

export type EnvStatusSnapshot = {
    nodeEnv: string;
    databaseConfigured: boolean;
    smtpConfigured: boolean;
    mercadoPagoConfigured: boolean;
    instagramConfigured: boolean;
    googleOAuthConfigured: boolean;
    sessionConfigured: boolean;
};

export function buildEnvStatusSnapshot(): EnvStatusSnapshot {
    return {
        nodeEnv: env.NODE_ENV,
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        smtpConfigured: Boolean(
            process.env.SMTP_HOST
            && process.env.SMTP_USER
            && process.env.SMTP_PASSWORD
            && process.env.SMTP_FROM,
        ),
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        instagramConfigured: isInstagramConfigured(),
        googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        sessionConfigured: Boolean(process.env.SESSION_SECRET),
    };
}
