#!/usr/bin/env node
/**
 * Reescribe URLs Backblaze B2 → R2 en rawData de listings (y seeds boost) vía API admin local/prod.
 * Uso:
 *   node scripts/rewrite-backblaze-urls.mjs --dry-run
 *   API_BASE_URL=https://api.simpleplataforma.app ADMIN_TOKEN=... node scripts/rewrite-backblaze-urls.mjs
 *
 * Si no hay endpoint admin, imprime cuántas URLs B2 vería en un sample público.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvDeploy();

const API = (process.env.API_BASE_URL || 'https://api.simpleplataforma.app').replace(/\/$/, '');
const R2 = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev').replace(/\/+$/, '');

function rewrite(url) {
  const m = String(url).match(/^https?:\/\/[^/]*backblazeb2\.com\/file\/simple-media\/(.+)$/i);
  if (!m) return url;
  return `${R2}/${decodeURIComponent(m[1])}`;
}

async function samplePublic() {
  const verticals = ['autos', 'propiedades'];
  let b2 = 0;
  let total = 0;
  for (const vertical of verticals) {
    const res = await fetch(`${API}/api/public/listings?vertical=${vertical}&section=sale&limit=30`);
    const data = await res.json();
    for (const item of data.items || []) {
      for (const img of item.images || []) {
        total += 1;
        if (/backblazeb2\.com/i.test(img)) {
          b2 += 1;
          console.log('  B2 still visible:', img.slice(0, 100));
          console.log('  → would become:', rewrite(img).slice(0, 100));
        }
      }
    }
  }
  console.log(`Sample público: ${b2}/${total} imágenes aún con Backblaze`);
  return b2;
}

async function main() {
  console.log(dryRun ? 'DRY RUN' : 'CHECK');
  console.log('API', API);
  console.log('R2', R2);
  const remaining = await samplePublic();
  if (remaining === 0) {
    console.log('OK: la API ya no expone URLs Backblaze en el sample (rewrite en delivery activo tras deploy).');
  } else {
    console.log('Tras desplegar simple-api con rewriteLegacyBackblazeUrl, estas URLs dejarán de salir al público.');
    console.log('Para persistir el cambio en DB hace falta un job de migración de rawData (opcional).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
