#!/usr/bin/env node
/**
 * Audita y opcionalmente corrige variables de entorno en Coolify (servicios simple*).
 * Uso:
 *   node scripts/coolify-env-audit.mjs           # solo reporte
 *   node scripts/coolify-env-audit.mjs --apply    # corrige y redeploy frontends tocados
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
const apply = process.argv.includes('--apply');

if (!COOLIFY_URL || !COOLIFY_API_TOKEN) {
  console.error('Faltan COOLIFY_URL o COOLIFY_API_TOKEN (.env.deploy).');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const API_INTERNAL = 'https://api.simpleplataforma.app';
const API_PUBLIC = 'https://api.simpleplataforma.app';
const INSTAGRAM_CALLBACK = `${API_PUBLIC}/api/integrations/instagram/callback`;

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

const OBSOLETE_EXACT = new Set([
  'GOOGLE_REDIRECT_URI',
  'STORAGE_PROVIDER_S3',
  'AWS_S3_BUCKET',
  'S3_BUCKET',
  'MERCADO_PAGO_PUBLIC_ORIGIN',
]);
const OBSOLETE_PREFIXES = ['BACKBLAZE', 'B2_'];

function isObsoleteEnvKey(key) {
  return OBSOLETE_EXACT.has(key) || OBSOLETE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** @type {Record<string, { checks: Array<{ key: string; expected: string | null; forbidden?: boolean }> }>} */
const EXPECTED = {
  'simple-api': {
    checks: [
      { key: 'NODE_ENV', expected: 'production' },
      { key: 'API_BASE_URL', expected: API_PUBLIC },
      { key: 'AUTH_COOKIE_SAMESITE', expected: 'none' },
      { key: 'AUTOS_APP_URL', expected: 'https://simpleautos.app' },
      { key: 'PROPIEDADES_APP_URL', expected: 'https://simplepropiedades.app' },
      { key: 'AGENDA_APP_URL', expected: 'https://simpleagenda.app' },
      { key: 'SERENATAS_APP_URL', expected: 'https://simpleserenatas.app' },
      { key: 'INSTAGRAM_REDIRECT_URI', expected: INSTAGRAM_CALLBACK },
      { key: 'GOOGLE_REDIRECT_URI', expected: null, forbidden: true },
      { key: 'MERCADO_PAGO_WEBHOOK_SECRET', expected: '__SET__' },
    ],
    rejectLocalhost: [
      'AUTOS_APP_URL',
      'PROPIEDADES_APP_URL',
      'AGENDA_APP_URL',
      'SERENATAS_APP_URL',
      'INSTAGRAM_REDIRECT_URI',
      'API_BASE_URL',
    ],
  },
  simpleautos: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://simpleautos.app' },
    ],
  },
  simplepropiedades: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://simplepropiedades.app' },
    ],
  },
  simpleserenatas: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://simpleserenatas.app' },
    ],
  },
  simpleagenda: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://simpleagenda.app' },
    ],
  },
  simpleadmin: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://admin.simpleplataforma.app' },
    ],
  },
  simpleplataforma: {
    checks: [
      { key: 'NEXT_PUBLIC_API_URL', expected: '' },
      { key: 'API_INTERNAL_URL', expected: API_INTERNAL },
      { key: 'NEXT_PUBLIC_APP_URL', expected: 'https://simpleplataforma.app' },
    ],
  },
};

function normalizeValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function statusFor(check, envMap) {
  const current = envMap.has(check.key) ? normalizeValue(envMap.get(check.key)) : undefined;

  if (check.forbidden) {
    if (current === undefined) return { ok: true, current: '(no definida)', action: null };
    if (current === '') return { ok: false, current: '(vacía)', action: 'delete' };
    return { ok: false, current: '[definida — eliminar]', action: 'delete' };
  }

  if (check.expected === '__SET__') {
    if (current === undefined || current === '') {
      return { ok: false, current: current ?? '(no definida)', action: 'warn' };
    }
    return { ok: true, current: '[definida]', action: null };
  }

  if (current === undefined) {
    return { ok: false, current: '(no definida)', action: 'create' };
  }

  if (normalizeValue(current) !== normalizeValue(check.expected ?? '')) {
    return { ok: false, current: current || '(vacía)', action: 'update' };
  }

  return { ok: true, current: current || '(vacía)', action: null };
}

async function listApps() {
  const res = await fetch(`${COOLIFY_URL}/api/v1/applications`, { headers });
  if (!res.ok) throw new Error(`List apps: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listEnvs(uuid) {
  const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${uuid}/envs`, { headers });
  if (!res.ok) throw new Error(`List envs ${uuid}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function createEnv(uuid, key, value) {
  const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${uuid}/envs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key,
      value,
      is_buildtime: true,
      is_runtime: true,
      is_literal: false,
    }),
  });
  if (!res.ok) throw new Error(`Create ${key}: ${res.status} ${await res.text()}`);
}

async function updateEnv(uuid, key, value, envRow) {
  const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${uuid}/envs`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      key,
      value,
      is_buildtime: envRow?.is_buildtime ?? true,
      is_runtime: envRow?.is_runtime ?? true,
      is_literal: envRow?.is_literal ?? false,
    }),
  });
  if (!res.ok) throw new Error(`Update ${key}: ${res.status} ${await res.text()}`);
}

async function deleteEnv(uuid, envUuid) {
  const res = await fetch(`${COOLIFY_URL}/api/v1/applications/${uuid}/envs/${envUuid}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Delete env ${envUuid}: ${res.status} ${await res.text()}`);
}

async function deployApps(uuids, { force = false } = {}) {
  const deployRes = await fetch(
    `${COOLIFY_URL}/api/v1/deploy?uuid=${uuids.join(',')}&force=${force ? 'true' : 'false'}`,
    { headers },
  );
  const body = await deployRes.json();
  if (!deployRes.ok) throw new Error(`Deploy: ${deployRes.status} ${JSON.stringify(body)}`);
  return body;
}

async function verifyInstagramCallbackRedirect() {
  try {
    const res = await fetch(`${API_PUBLIC}/api/integrations/instagram/callback?error=env-audit`, {
      redirect: 'manual',
    });
    const location = res.headers.get('location') ?? '';
    if (!location) return { ok: false, detail: 'sin header Location' };
    if (LOCALHOST_PATTERN.test(location)) {
      return { ok: false, detail: location };
    }
    if (!location.includes('simpleautos.app')) {
      return { ok: false, detail: location };
    }
    return { ok: true, detail: location };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function localhostIssueFor(spec, key, current) {
  if (!spec.rejectLocalhost?.includes(key)) return null;
  if (!current || current === '(no definida)' || current === '(vacía)') return null;
  if (!LOCALHOST_PATTERN.test(current)) return null;
  return 'update';
}

async function main() {
  const apps = await listApps();
  const targets = apps.filter((a) => typeof a.name === 'string' && a.name in EXPECTED);

  let issues = 0;
  const toRedeploy = [];

  for (const app of targets.sort((a, b) => a.name.localeCompare(b.name))) {
    const spec = EXPECTED[app.name];
    const envRows = await listEnvs(app.uuid);
    /** @type {Map<string, typeof envRows>} */
    const byKey = new Map();
    for (const row of envRows) {
      const list = byKey.get(row.key) ?? [];
      list.push(row);
      byKey.set(row.key, list);
    }

    const envMap = new Map();
    for (const [key, rows] of byKey) {
      const preferred = rows.find((r) => normalizeValue(r.real_value ?? r.value) === '') ?? rows[rows.length - 1];
      envMap.set(key, preferred.real_value ?? preferred.value ?? '');
    }

    console.log(`\n## ${app.name}`);
    let appChanged = false;

    // Eliminar duplicados solo en claves que auditamos (evita tocar secretos del API al azar).
    for (const check of spec.checks) {
      const rows = byKey.get(check.key);
      if (!rows || rows.length <= 1) continue;
      const targetValue = check.forbidden ? null : check.expected ?? null;
      let keeper = rows[0];
      if (targetValue !== null) {
        keeper = rows.find((r) => normalizeValue(r.real_value ?? r.value) === normalizeValue(targetValue)) ?? keeper;
      } else if (check.key === 'NEXT_PUBLIC_API_URL') {
        keeper = rows.find((r) => normalizeValue(r.real_value ?? r.value) === '') ?? keeper;
      }
      for (const row of rows) {
        if (row.uuid === keeper.uuid) continue;
        console.log(`  ~~  ${check.key} duplicada (${row.uuid.slice(0, 8)}…) → eliminar`);
        issues += 1;
        if (apply) {
          await deleteEnv(app.uuid, row.uuid);
          appChanged = true;
        }
      }
      envMap.set(check.key, keeper.real_value ?? keeper.value ?? '');
    }

    for (const check of spec.checks) {
      let { ok, current, action } = statusFor(check, envMap);
      const localhostAction = localhostIssueFor(spec, check.key, current);
      if (localhostAction) {
        ok = false;
        action = localhostAction;
      }
      const expectedLabel = check.forbidden
        ? 'no definir'
        : check.expected === '__SET__'
          ? 'definida (secreto)'
          : JSON.stringify(check.expected ?? '');

      if (ok) {
        console.log(`  OK  ${check.key} = ${current}`);
        continue;
      }

      issues += 1;
      console.log(`  !!  ${check.key}`);
      console.log(`       actual: ${current}`);
      console.log(`       esperado: ${expectedLabel}`);
      if (localhostAction) {
        console.log('       motivo: valor contiene localhost');
      }

      if (!apply || action === 'warn') {
        if (action === 'warn') console.log('       acción: agregar manualmente en Coolify (secreto)');
        continue;
      }

      if (action === 'delete') {
        const rows = byKey.get(check.key) ?? [];
        for (const row of rows) {
          await deleteEnv(app.uuid, row.uuid);
        }
        console.log('       acción: eliminada');
        appChanged = true;
      } else if (action === 'create') {
        await createEnv(app.uuid, check.key, check.expected ?? '');
        console.log('       acción: creada');
        appChanged = true;
      } else if (action === 'update') {
        const rows = byKey.get(check.key) ?? [];
        const row = rows[0];
        if (row) {
          await updateEnv(app.uuid, check.key, check.expected ?? '', row);
        } else {
          await createEnv(app.uuid, check.key, check.expected ?? '');
        }
        console.log('       acción: actualizada');
        appChanged = true;
      }
    }

    if (appChanged) toRedeploy.push(app);
  }

  console.log('\n## Variables obsoletas (legado)');
  for (const app of targets.sort((a, b) => a.name.localeCompare(b.name))) {
    const envRows = await listEnvs(app.uuid);
    const obsolete = envRows.filter((row) => isObsoleteEnvKey(row.key));
    if (!obsolete.length) continue;

    console.log(`\n### ${app.name}`);
    for (const row of obsolete) {
      issues += 1;
      console.log(`  !!  ${row.key} → eliminar (legado)`);
      if (apply) {
        await deleteEnv(app.uuid, row.uuid);
        console.log('       acción: eliminada');
        if (!toRedeploy.some((a) => a.uuid === app.uuid)) toRedeploy.push(app);
      }
    }
  }

  console.log(`\n--- Resumen: ${issues} problema(s) encontrado(s) ---`);

  const forceRedeployApi = apply && process.argv.includes('--force-api');
  if (apply && (toRedeploy.length || forceRedeployApi)) {
    const apiApp = targets.find((a) => a.name === 'simple-api');
    const names = [...new Set([
      ...toRedeploy.map((a) => a.name),
      ...(forceRedeployApi && apiApp ? ['simple-api'] : []),
    ])];
    const uuids = [...new Set([
      ...toRedeploy.map((a) => a.uuid),
      ...(forceRedeployApi && apiApp ? [apiApp.uuid] : []),
    ])];
    console.log(`\nRedeploy${forceRedeployApi ? ' (force)' : ''}: ${names.join(', ')}`);
    await deployApps(uuids, { force: forceRedeployApi });
    console.log('Deploy encolado.');
  } else if (apply && !toRedeploy.length && issues === 0) {
    console.log('\nSin cambios necesarios.');
  } else if (!apply && issues > 0) {
    console.log('\nEjecuta con --apply para corregir automáticamente (excepto secretos).');
  }

  if (apply) {
    console.log('\nVerificando redirect OAuth de Instagram en producción…');
    for (let attempt = 1; attempt <= 18; attempt += 1) {
      const result = await verifyInstagramCallbackRedirect();
      if (result.ok) {
        console.log(`  OK  callback → ${result.detail}`);
        break;
      }
      if (attempt === 18) {
        issues += 1;
        console.log(`  !!  callback sigue incorrecto: ${result.detail}`);
        console.log('       El deploy puede seguir en curso; reintenta en unos minutos.');
      } else {
        console.log(`  … intento ${attempt}/18: ${result.detail}`);
        await new Promise((resolve) => setTimeout(resolve, 20_000));
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
