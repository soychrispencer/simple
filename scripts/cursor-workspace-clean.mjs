#!/usr/bin/env node
/**
 * Limpieza segura del workspace para aliviar Cursor (indexado, watchers, disco).
 * NO toca historial de chat ni datos internos de Cursor.
 *
 * Uso:
 *   node scripts/cursor-workspace-clean.mjs
 *   node scripts/cursor-workspace-clean.mjs --if-stale   # máx. 1 vez cada 6 h
 *   node scripts/cursor-workspace-clean.mjs --dry-run
 */
import { existsSync, readdirSync, rmSync, statSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const ifStale = args.has('--if-stale');
const STALE_MS = 6 * 60 * 60 * 1000;
const stampPath = resolve(root, '.cursor', '.last-workspace-clean');

const RELATIVE_TARGETS = [
  '.turbo',
  '.cache',
  'playwright-report',
  'test-results',
  'blob-report',
  'coverage',
  'services/api/uploads',
];

function log(message) {
  if (!ifStale && !dryRun) {
    console.log(message);
  } else if (dryRun) {
    console.log(`[dry-run] ${message}`);
  }
}

function shouldRun() {
  if (!ifStale) return true;
  if (!existsSync(stampPath)) return true;
  try {
    const last = Number(readFileSync(stampPath, 'utf8').trim());
    return !Number.isFinite(last) || Date.now() - last >= STALE_MS;
  } catch {
    return true;
  }
}

function markRan() {
  if (dryRun) return;
  mkdirSync(dirname(stampPath), { recursive: true });
  writeFileSync(stampPath, String(Date.now()), 'utf8');
}

function removePath(targetPath) {
  if (!existsSync(targetPath)) return 0;
  const sizeHint = safeStat(targetPath);
  if (dryRun) {
    log(`eliminaría ${targetPath}${sizeHint ? ` (${sizeHint})` : ''}`);
    return 1;
  }
  rmSync(targetPath, { recursive: true, force: true });
  log(`eliminado ${targetPath}${sizeHint ? ` (${sizeHint})` : ''}`);
  return 1;
}

function safeStat(targetPath) {
  try {
    const st = statSync(targetPath);
    if (st.isFile()) return formatBytes(st.size);
    return 'dir';
  } catch {
    return '';
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function devLikelyRunning() {
  const appsDir = resolve(root, 'apps');
  if (!existsSync(appsDir)) return false;
  let devMarkers = 0;
  for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (existsSync(join(appsDir, entry.name, '.next', 'dev'))) devMarkers += 1;
  }
  return devMarkers >= 1;
}

function cleanNextCaches() {
  if (!args.has('--include-next-cache')) {
    if (args.has('--verbose')) log('omitido .next/cache (usar --include-next-cache con dev detenido)');
    return 0;
  }
  if (devLikelyRunning()) {
    if (args.has('--verbose')) log('omitido .next/cache (Next dev detectado; detén pnpm run dev:all primero)');
    return 0;
  }

  let count = 0;
  const appsDir = resolve(root, 'apps');
  if (!existsSync(appsDir)) return count;

  for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const cacheDir = join(appsDir, entry.name, '.next', 'cache');
    count += removePath(cacheDir);
  }
  return count;
}

function main() {
  if (!shouldRun()) {
    if (args.has('--verbose')) console.log('cursor-workspace-clean: omitido (limpieza reciente)');
    process.exit(0);
  }

  let removed = 0;
  for (const rel of RELATIVE_TARGETS) {
    removed += removePath(resolve(root, rel));
  }
  removed += cleanNextCaches();

  if (removed > 0) {
    markRan();
    if (!dryRun && !ifStale) {
      console.log(`Limpieza lista (${removed} ruta(s)). El historial del chat no se modificó.`);
    }
  } else if (!ifStale) {
    console.log('Nada que limpiar.');
  } else {
    markRan();
  }
}

main();
