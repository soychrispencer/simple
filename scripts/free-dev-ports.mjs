#!/usr/bin/env node
/**
 * Libera puertos de desarrollo antes de dev:all (API + apps Next).
 */
import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
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
const DEV_ALL_ARGUMENTS = '--names simpleadmin,simpleplataforma,simpleautos,simplepropiedades,simpleagenda,simpleserenatas,api';

function normalizedCommand(value) {
    return String(value ?? '').replaceAll('\\', '/').toLowerCase();
}

function existingDevAllPidsWindows() {
    const output = execFileSync('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const parsed = output.trim() ? JSON.parse(output) : [];
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    const projectRoot = normalizedCommand(path.resolve(process.cwd()));
    const expectedArguments = normalizedCommand(DEV_ALL_ARGUMENTS);

    return processes
        .filter((item) => String(item.Name ?? '').toLowerCase() === 'node.exe')
        .filter((item) => Number(item.ProcessId) !== process.pid)
        .filter((item) => {
            const command = normalizedCommand(item.CommandLine);
            return command.includes(projectRoot)
                && command.includes('concurrently')
                && command.includes(expectedArguments);
        })
        .map((item) => String(item.ProcessId))
        .filter((pid) => /^\d+$/.test(pid));
}

function existingDevAllPidsUnix() {
    const output = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' });
    const projectRoot = normalizedCommand(path.resolve(process.cwd()));
    const expectedArguments = normalizedCommand(DEV_ALL_ARGUMENTS);
    const pids = [];

    for (const line of output.split(/\r?\n/)) {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (!match || Number(match[1]) === process.pid) continue;
        const command = normalizedCommand(match[2]);
        if (command.includes(projectRoot) && command.includes('concurrently') && command.includes(expectedArguments)) {
            pids.push(match[1]);
        }
    }

    return pids;
}

function stopExistingDevAll() {
    const pids = process.platform === 'win32'
        ? existingDevAllPidsWindows()
        : existingDevAllPidsUnix();

    for (const pid of pids) {
        try {
            if (process.platform === 'win32') {
                // Stop the supervisor's whole child tree so its watchers cannot reclaim the ports.
                execFileSync('taskkill.exe', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
            } else {
                process.kill(Number(pid), 'SIGTERM');
            }
            console.log(`[free-dev-ports] dev:all anterior detenido (PID ${pid}).`);
        } catch {
            // It may have exited between discovery and termination.
        }
    }
}

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
            execFileSync('taskkill.exe', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
        } else {
            execFileSync('kill', ['-9', pid], { stdio: 'ignore' });
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

try {
    stopExistingDevAll();
    await new Promise((resolve) => setTimeout(resolve, 300));
} catch (error) {
    failed = true;
    console.error('[free-dev-ports] No se pudieron identificar los procesos dev:all anteriores.', error);
}

for (const { port, label } of ports) {
    try {
        await freePort(port, label);
    } catch (error) {
        failed = true;
        console.error(error instanceof Error ? error.message : String(error));
    }
}

process.exit(failed ? 1 : 0);
