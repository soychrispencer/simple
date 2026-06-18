#!/usr/bin/env node
/**
 * Bloquea regresiones de terminología legacy (coordinator/admin del negocio Serenatas).
 * Corre con: pnpm run verify:terminology
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '..', '..');

const SCAN_DIRS = [
    join(root, 'src'),
    join(repoRoot, 'services', 'api', 'src', 'modules', 'serenatas'),
];

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const forbidden = [
    { pattern: /\bcoordinator\b/i, label: 'coordinator (inglés)' },
    { pattern: /\bcoordinador\b/i, label: 'coordinador (español)' },
    { pattern: /profiles\.coordinator/, label: 'profiles.coordinator' },
    { pattern: /profiles\.admin/, label: 'profiles.admin' },
    { pattern: /\/profiles\/admin/, label: 'ruta /profiles/admin' },
    { pattern: /\/subscriptions\/admin\//, label: 'ruta /subscriptions/admin/' },
    { pattern: /Serenatas:\s*proveedor/i, label: 'etiqueta Serenatas: proveedor' },
    { pattern: /registerCoordinator/, label: 'registerCoordinator' },
    { pattern: /registerAdmin/, label: 'registerAdmin (serenatas)' },
    { pattern: /\bAdministrador del mariachi\b/i, label: 'Administrador del mariachi' },
];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (name === 'node_modules' || name === '.next') continue;
            walk(full, out);
            continue;
        }
        const ext = full.slice(full.lastIndexOf('.'));
        if (EXT.has(ext)) out.push(full);
    }
    return out;
}

const errors = [];

for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
        const source = readFileSync(file, 'utf8');
        for (const { pattern, label } of forbidden) {
            if (pattern.test(source)) {
                errors.push(`${file.replace(repoRoot + '\\', '').replace(repoRoot + '/', '')}: ${label}`);
            }
        }
    }
}

if (errors.length > 0) {
    console.error('[verify:terminology] Términos legacy detectados:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
}

console.info('[verify:terminology] OK — terminología Dueño/Dueños sin residuos coordinator/admin de negocio.');
