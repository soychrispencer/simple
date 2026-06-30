#!/usr/bin/env node
/**
 * Copia *.env.local.example → .env.local donde falte el archivo local.
 * Idempotente: no sobrescribe configuración existente.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  'services/api/.env.local',
  'apps/simpleadmin/.env.local',
  'apps/simpleplataforma/.env.local',
  'apps/simpleautos/.env.local',
  'apps/simplepropiedades/.env.local',
  'apps/simpleagenda/.env.local',
  'apps/simpleserenatas/.env.local',
];

let created = 0;
let skipped = 0;

for (const rel of targets) {
  const dest = join(root, rel);
  const example = dest.replace(/\.env\.local$/, '.env.local.example');

  if (existsSync(dest)) {
    skipped += 1;
    continue;
  }
  if (!existsSync(example)) {
    console.warn(`[setup:env] Sin plantilla: ${example}`);
    continue;
  }

  copyFileSync(example, dest);
  created += 1;
  console.log(`[setup:env] Creado ${rel}`);
}

if (created === 0 && skipped === targets.length) {
  console.log('[setup:env] Todos los .env.local ya existen.');
} else {
  console.log(`[setup:env] Listo (${created} creado(s), ${skipped} omitido(s)).`);
  console.log('[setup:env] Revisa DATABASE_URL en services/api/.env.local si Postgres no es local.');
}
