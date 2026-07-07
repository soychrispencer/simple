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
const deploymentUuid = process.argv[2];
const appName = process.argv[3] ?? 'simple-api';

if (!COOLIFY_URL || !COOLIFY_API_TOKEN) {
  console.error('Faltan COOLIFY_URL o COOLIFY_API_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
  Accept: 'application/json',
};

async function main() {
  const listRes = await fetch(`${COOLIFY_URL}/api/v1/applications`, { headers });
  if (!listRes.ok) {
    console.error('list apps failed', listRes.status, await listRes.text());
    process.exit(1);
  }
  const apps = await listRes.json();
  const app = apps.find((item) => item.name === appName);
  if (!app) {
    console.error(`App no encontrada: ${appName}`);
    process.exit(1);
  }

  if (!deploymentUuid) {
    console.log('Aplicaciones simple:');
    for (const item of apps.filter((entry) => String(entry.name).startsWith('simple')).sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  - ${item.name}: ${item.status ?? 'unknown'}${item.health ? ` (${item.health})` : ''}`);
    }
    console.log('');
  }

  console.log(JSON.stringify({
    name: app.name,
    status: app.status,
    health: app.health,
    fqdn: app.fqdn,
    git_commit_sha: app.git_commit_sha,
    updated_at: app.updated_at,
  }, null, 2));

  if (deploymentUuid) {
    const depRes = await fetch(`${COOLIFY_URL}/api/v1/deployments/${deploymentUuid}`, { headers });
    if (!depRes.ok) {
      console.error('deployment failed', depRes.status, await depRes.text());
      process.exit(1);
    }
    const deployment = await depRes.json();
    console.log(JSON.stringify({
      deployment_uuid: deployment.deployment_uuid,
      status: deployment.status,
      finished_at: deployment.finished_at,
      commit: deployment.commit,
    }, null, 2));
    if (deployment.status === 'failed') process.exit(1);
    if (deployment.status === 'finished' || deployment.status === 'success') process.exit(0);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
