#!/usr/bin/env node
/**
 * Libera puertos de desarrollo antes de dev:all (API + apps Next).
 */
import { execSync } from 'node:child_process';
import net from 'node:net';

const host = process.env.SIMPLE_DEV_HOST ?? '127.0.0.1';

const DEFAULT_PORTS = [
    { port: 4000, label: 'api' },
    { port: 3000, label: 'simpleadmin' },
    { port: 3001, label: 'simpleplataforma' },
    { port: 3002, label: 'simpleautos' },
    { port: 3003, label: 'simplepropiedades' },
    { port: 3004, label: 'simpleagenda' },
    { port: 3005, label: 'simpleserenatas' },
];

function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = net.connect({ host, port }, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
    });
}

function pidsOnPortWindows(targetPort) {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
    });
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
        const output = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
        });
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

async function freePort(port, label) {
    if (!(await isPortOpen(port))) {
        return;
    }

    const pids = process.platform === 'win32' ? pidsOnPortWindows(port) : pidsOnPortUnix(port);

    if (pids.length === 0) {
        console.warn(`[free-dev-ports] Puerto ${port} (${label}) ocupado sin PID detectable.`);
        return;
    }

    for (const pid of pids) {
        if (killPid(pid)) {
            console.log(`[free-dev-ports] Puerto ${port} (${label}) liberado (PID ${pid}).`);
        }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    if (await isPortOpen(port)) {
        throw new Error(`No se pudo liberar ${host}:${port} (${label}). Cierra el proceso manualmente.`);
    }
}

const extra = (process.env.SIMPLE_DEV_PORTS ?? '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

const ports = [
    ...DEFAULT_PORTS,
    ...extra.map((port) => ({ port, label: `extra:${port}` })),
];

let failed = false;

for (const { port, label } of ports) {
    try {
        await freePort(port, label);
    } catch (error) {
        failed = true;
        console.error(error instanceof Error ? error.message : String(error));
    }
}

process.exit(failed ? 1 : 0);
