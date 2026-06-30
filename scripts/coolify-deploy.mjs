#!/usr/bin/env node
/**
 * Encola redeploy en Coolify para servicios Simple.
 * Credenciales: COOLIFY_URL + COOLIFY_API_TOKEN (env o .env.deploy en la raíz).
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

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '');
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN;

if (!COOLIFY_URL || !COOLIFY_API_TOKEN) {
  console.error(
    'Faltan COOLIFY_URL o COOLIFY_API_TOKEN.\n' +
      'Copia .env.deploy.example → .env.deploy o exporta las variables.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const appFlags = args.filter((a) => a.startsWith('--app=')).map((a) => a.slice(6));
const namedApps = args.filter((a) => !a.startsWith('--'));
const targetNames = [...appFlags, ...namedApps];
const deployAll = targetNames.length === 0;

const headers = {
  Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
  Accept: 'application/json',
};

async function main() {
  const listRes = await fetch(`${COOLIFY_URL}/api/v1/applications`, { headers });
  if (!listRes.ok) {
    console.error('No se pudo listar aplicaciones:', listRes.status, await listRes.text());
    process.exit(1);
  }

  const apps = await listRes.json();
  const targets = deployAll
    ? apps.filter((a) => typeof a.name === 'string' && a.name.startsWith('simple'))
    : apps.filter((a) => targetNames.includes(a.name));

  if (!targets.length) {
    console.error(
      deployAll
        ? 'No hay aplicaciones simple* en Coolify.'
        : `No se encontraron: ${targetNames.join(', ')}`,
    );
    process.exit(1);
  }

  const uuids = targets.map((a) => a.uuid).join(',');
  const deployRes = await fetch(
    `${COOLIFY_URL}/api/v1/deploy?uuid=${uuids}&force=${force}`,
    { headers },
  );
  const body = await deployRes.json();

  if (!deployRes.ok) {
    console.error('Deploy falló:', deployRes.status, body);
    process.exit(1);
  }

  console.log(`Encolados ${targets.length} servicio(s):`);
  for (const app of targets) {
    console.log(`  - ${app.name} (${app.status ?? 'unknown'})`);
  }
  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
