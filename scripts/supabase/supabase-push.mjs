#!/usr/bin/env node
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const TARGET_ENV = process.argv[2];
const EXTRA_ARGS = process.argv.slice(3);
const TARGETS = {
  staging: 'SUPABASE_STAGING_DB_URL',
  prod: 'SUPABASE_PROD_DB_URL'
};

const cwd = process.cwd();
const envFiles = [
  path.join(cwd, '.env'),
  path.join(cwd, 'backend', 'supabase', '.env')
];

for (const file of envFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

if (!TARGET_ENV || !TARGETS[TARGET_ENV]) {
  console.error('Uso: node scripts/supabase/supabase-push.mjs <staging|prod> [flags...]');
  process.exit(1);
}

const envVar = TARGETS[TARGET_ENV];
const dbUrl = process.env[envVar];

if (!dbUrl) {
  console.error(`La variable de entorno ${envVar} no está definida. Configúrala antes de continuar.`);
  process.exit(1);
}

const supabaseDir = path.resolve(process.cwd(), 'backend', 'supabase');
const args = ['db', 'push', '--db-url', dbUrl, ...EXTRA_ARGS];

const binName = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
const localBin = path.join(process.cwd(), 'node_modules', '.bin', binName);
const command = fs.existsSync(localBin) ? localBin : binName;

const safeArgs = process.platform === 'win32'
  ? args.map((arg) => {
      let escaped = arg.replace(/%/g, '%%');
      if (/[*&|<>^]/.test(escaped)) {
        escaped = `"${escaped}"`;
      }
      return escaped;
    })
  : args;

const child = spawn(command, safeArgs, {
  cwd: supabaseDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
