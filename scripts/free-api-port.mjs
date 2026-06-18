#!/usr/bin/env node
/**
 * Libera el puerto de la API antes de dev:all (evita EADDRINUSE por instancias zombie).
 */
import { execSync } from 'node:child_process';
import net from 'node:net';

const host = process.env.SIMPLE_API_HOST ?? '127.0.0.1';
const port = Number(process.env.SIMPLE_API_PORT ?? 4000);

function isPortOpen() {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port }, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
    });
}

function pidsOnPortWindows(targetPort) {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
            pids.add(pid);
        }
    }
    return [...pids];
}

function pidsOnPortUnix(targetPort) {
    try {
        const output = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((pid) => /^\d+$/.test(pid));
    } catch {
        return [];
    }
}

function killPid(pid) {
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } else {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        }
        return true;
    } catch {
        return false;
    }
}

if (!(await isPortOpen())) {
    process.exit(0);
}

const pids = process.platform === 'win32' ? pidsOnPortWindows(port) : pidsOnPortUnix(port);

if (pids.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[free-api-port] Puerto ${port} ocupado pero no se detectó PID; continúa bajo tu propio riesgo.`);
    process.exit(0);
}

for (const pid of pids) {
    if (killPid(pid)) {
        // eslint-disable-next-line no-console
        console.log(`[free-api-port] Puerto ${port} liberado (PID ${pid}).`);
    }
}

await new Promise((resolve) => setTimeout(resolve, 400));

if (await isPortOpen()) {
    // eslint-disable-next-line no-console
    console.error(`[free-api-port] No se pudo liberar ${host}:${port}. Cierra el proceso manualmente.`);
    process.exit(1);
}
