/**
 * Verifica credenciales y configuración mínima de Mercado Pago.
 *
 *   pnpm run mercadopago:verify
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getMercadoPagoAccessTokenMode,
    getMercadoPagoPaymentsWebhookUrl,
    isMercadoPagoConfigured,
} from '../src/modules/mercadopago/service.js';

function loadEnvLocal(): void {
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
    }
}

async function main() {
    loadEnvLocal();

    if (!isMercadoPagoConfigured()) {
        console.error('✗ Falta MERCADO_PAGO_ACCESS_TOKEN');
        process.exit(1);
    }

    const mode = getMercadoPagoAccessTokenMode();
    const token = (process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '').trim();
    const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await res.json().catch(() => ({})) as Record<string, unknown>;

    console.log(`Token: ${mode === 'production' ? 'producción (APP_USR)' : 'test (TEST-)'}`);
    console.log(`API /users/me: ${res.status === 200 ? 'OK' : `error ${res.status}`}`);
    if (res.status === 200) {
        console.log(`Cuenta MP: ${String(profile.nickname ?? profile.id ?? '—')} · site ${String(profile.site_id ?? '—')}`);
    }

    const webhookSecret = Boolean((process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '').trim());
    const webhookUrl = getMercadoPagoPaymentsWebhookUrl();
    console.log(`Webhook secret: ${webhookSecret ? 'configurado' : 'falta MERCADO_PAGO_WEBHOOK_SECRET'}`);
    console.log(`Webhook URL sugerida: ${webhookUrl ?? '(configura API_BASE_URL HTTPS)'}`);

    const origins = [
        'MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS',
        'MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES',
        'MERCADO_PAGO_PUBLIC_ORIGIN_AGENDA',
        'MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS',
    ];
    for (const key of origins) {
        const value = (process.env[key] ?? '').trim();
        console.log(`${key}: ${value || '(no definido — usa URL pública HTTPS en producción)'}`);
    }

    const readyForProduction =
        res.status === 200
        && mode === 'production'
        && webhookSecret
        && webhookUrl?.startsWith('https://');

    console.log('');
    if (readyForProduction) {
        console.log('✓ Mercado Pago listo para producción (credenciales + webhook + API HTTPS).');
    } else {
        console.log('⚠ Mercado Pago operativo para desarrollo; revisa los ítems marcados antes de producción.');
        if (res.status !== 200) process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
