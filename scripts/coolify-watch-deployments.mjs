#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvDeploy() {
  const path = resolve(root, '.env.deploy');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvDeploy();

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '');
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN;
const deploymentUuids = process.argv.slice(2);

if (!COOLIFY_URL || !COOLIFY_API_TOKEN) {
  console.error('Faltan COOLIFY_URL o COOLIFY_API_TOKEN');
  process.exit(1);
}

if (!deploymentUuids.length) {
  console.error('Uso: node scripts/coolify-watch-deployments.mjs <deployment_uuid> [...]');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
  Accept: 'application/json',
};

async function fetchDeployment(uuid) {
  const res = await fetch(`${COOLIFY_URL}/api/v1/deployments/${uuid}`, { headers });
  if (!res.ok) throw new Error(`No se pudo leer ${uuid}: ${res.status}`);
  return res.json();
}

async function pollOnce() {
  const results = await Promise.all(deploymentUuids.map(async (uuid) => {
    const deployment = await fetchDeployment(uuid);
    return {
      uuid,
      name: deployment.application_name,
      status: deployment.status,
      finished_at: deployment.finished_at,
    };
  }));
  return results;
}

async function main() {
  const maxAttempts = Number(process.env.COOLIFY_WATCH_MAX_ATTEMPTS ?? 40);
  const intervalMs = Number(process.env.COOLIFY_WATCH_INTERVAL_MS ?? 30000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const results = await pollOnce();
    console.log(`\nIntento ${attempt}/${maxAttempts}`);
    for (const item of results) {
      console.log(`  - ${item.name}: ${item.status}${item.finished_at ? ` @ ${item.finished_at}` : ''}`);
    }

    const failed = results.filter((item) => item.status === 'failed');
    if (failed.length > 0) {
      console.error('\nDespliegues fallidos:', failed.map((item) => item.name).join(', '));
      process.exit(1);
    }

    const pending = results.filter((item) => item.status !== 'finished' && item.status !== 'success');
    if (pending.length === 0) {
      console.log('\nTodos los despliegues finalizaron correctamente.');
      process.exit(0);
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, intervalMs));
  }

  console.error('\nTiempo de espera agotado; aún hay despliegues en progreso.');
  process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
