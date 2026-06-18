#!/usr/bin/env node
/**
 * Espera a que la API de Simple responda GET /api/health (no solo que el puerto esté abierto).
 */
import net from 'node:net';

const host = process.env.SIMPLE_API_HOST ?? '127.0.0.1';
const port = Number(process.env.SIMPLE_API_PORT ?? 4000);
const timeout = Number(process.env.SIMPLE_API_WAIT_TIMEOUT ?? 120000);
const interval = Number(process.env.SIMPLE_API_WAIT_INTERVAL ?? 300);
const healthPath = process.env.SIMPLE_API_HEALTH_PATH ?? '/api/health';
const baseUrl = `http://${host}:${port}`;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen() {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port }, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
    });
}

async function isApiHealthy() {
    try {
        const response = await fetch(`${baseUrl}${healthPath}`, {
            signal: AbortSignal.timeout(2500),
        });
        if (!response.ok) return false;
        const data = await response.json().catch(() => null);
        return Boolean(data?.ok && typeof data?.service === 'string');
    } catch {
        return false;
    }
}

async function waitForApi() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
        if (await isPortOpen()) {
            if (await isApiHealthy()) {
                return;
            }
        }
        await sleep(interval);
    }

    throw new Error(
        `Timeout esperando la API en ${baseUrl}${healthPath} (${timeout}ms). `
        + '¿Arrancó pnpm --filter=@simple/api run dev?',
    );
}

try {
    await waitForApi();
    // eslint-disable-next-line no-console
    console.log(`API lista en ${baseUrl}${healthPath}`);
    process.exit(0);
} catch (error) {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : 'Error esperando la API');
    process.exit(1);
}
