#!/usr/bin/env node
/**
 * Setea una variable de entorno en un servicio Coolify y opcionalmente redeploy.
 * Uso (no commitear el valor):
 *   COOLIFY_SET_VALUE="secreto" node scripts/coolify-env-set.mjs simple-api MERCADO_PAGO_WEBHOOK_SECRET --deploy
 */
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

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const deploy = process.argv.includes('--deploy');
const [appName, envKey] = args;
const value = process.env.COOLIFY_SET_VALUE ?? '';

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '');
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN;

if (!COOLIFY_URL || !COOLIFY_API_TOKEN) {
  console.error('Faltan COOLIFY_URL o COOLIFY_API_TOKEN (.env.deploy).');
  process.exit(1);
}
if (!appName || !envKey || !value) {
  console.error('Uso: COOLIFY_SET_VALUE="..." node scripts/coolify-env-set.mjs <app> <KEY> [--deploy]');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function main() {
  const apps = await fetch(`${COOLIFY_URL}/api/v1/applications`, { headers }).then((r) => r.json());
  const app = apps.find((a) => a.name === appName);
  if (!app) {
    console.error(`No se encontró la app: ${appName}`);
    process.exit(1);
  }

  const envs = await fetch(`${COOLIFY_URL}/api/v1/applications/${app.uuid}/envs`, { headers }).then((r) => r.json());
  const existing = envs.filter((e) => e.key === envKey);

  if (existing.length === 0) {
    const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${app.uuid}/envs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key: envKey,
        value,
        is_buildtime: false,
        is_runtime: true,
        is_literal: true,
      }),
    });
    if (!res.ok) throw new Error(`Create: ${res.status} ${await res.text()}`);
    console.log(`${appName}: creada ${envKey}`);
  } else {
    const row = existing[0];
    const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${app.uuid}/envs`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        key: envKey,
        value,
        is_buildtime: row.is_buildtime ?? false,
        is_runtime: row.is_runtime ?? true,
        is_literal: row.is_literal ?? true,
      }),
    });
    if (!res.ok) throw new Error(`Update: ${res.status} ${await res.text()}`);
    console.log(`${appName}: actualizada ${envKey}`);
    for (const dup of existing.slice(1)) {
      await fetch(`${COOLIFY_URL}/api/v1/applications/${app.uuid}/envs/${dup.uuid}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`${appName}: duplicado ${envKey} eliminado`);
    }
  }

  if (deploy) {
    const deployRes = await fetch(`${COOLIFY_URL}/api/v1/deploy?uuid=${app.uuid}&force=false`, { headers });
    const body = await deployRes.json();
    if (!deployRes.ok) throw new Error(`Deploy: ${deployRes.status} ${JSON.stringify(body)}`);
    console.log(`${appName}: redeploy encolado`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
