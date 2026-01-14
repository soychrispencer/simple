import fs from 'node:fs';
import path from 'node:path';

function findBaselineSeedPath() {
  const migrationsDir = path.resolve('backend', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('_baseline_seed.sql'));
  if (!files.length) {
    throw new Error('No se encontró *_baseline_seed.sql en backend/supabase/migrations');
  }
  files.sort();
  return path.join(migrationsDir, files[files.length - 1]);
}

const sql = fs.readFileSync(findBaselineSeedPath(), 'utf8');

const regionVarRegex = /SELECT id INTO (\w+) FROM public\.regions WHERE name = '((?:''|[^'])+)'/g;
const regionVarToName = new Map();
let regionMatch;
while ((regionMatch = regionVarRegex.exec(sql))) {
  const [, variable, regionName] = regionMatch;
  regionVarToName.set(variable, regionName.replace(/''/g, "'"));
}

const communeRegex = /\('((?:''|[^'])+)',\s*(\w+)_id\)/g;
const communesByRegion = new Map();
let communeMatch;
while ((communeMatch = communeRegex.exec(sql))) {
  const [, rawName, variableBase] = communeMatch;
  const regionName = regionVarToName.get(`${variableBase}_id`) || regionVarToName.get(variableBase);
  if (!regionName) {
    console.warn(`⚠️ Región no mapeada para variable: ${variableBase}`);
    continue;
  }
  const normalized = rawName.replace(/''/g, "'");
  if (!communesByRegion.has(regionName)) {
    communesByRegion.set(regionName, new Set());
  }
  communesByRegion.get(regionName).add(normalized);
}

const expectedCounts = new Map([
  ['Arica y Parinacota', 4],
  ['Tarapacá', 7],
  ['Antofagasta', 9],
  ['Atacama', 9],
  ['Coquimbo', 15],
  ['Valparaíso', 38],
  ['Metropolitana de Santiago', 52],
  ["Libertador General Bernardo O'Higgins", 33],
  ['Maule', 30],
  ['Ñuble', 21],
  ['Biobío', 33],
  ['Araucanía', 32],
  ['Los Ríos', 12],
  ['Los Lagos', 30],
  ['Aysén', 10],
  ['Magallanes', 11],
]);

let total = 0;
const missingByRegion = [];
const summary = [];
for (const [region, expected] of expectedCounts.entries()) {
  const set = communesByRegion.get(region) || new Set();
  const count = set.size;
  total += count;
  if (count !== expected) {
    const missing = expected - count;
    missingByRegion.push({ region, expected, actual: count, missing });
    const names = [...set].sort();
    summary.push({ region, expected, actual: count, names });
  }
}

console.log(`Total comunas registradas: ${total}`);
console.log('');
if (!missingByRegion.length) {
  console.log('✅ Todas las regiones tienen el número esperado de comunas.');
} else {
  console.log('⚠️ Regiones con diferencias:');
  for (const info of missingByRegion) {
    console.log(`- ${info.region}: ${info.actual}/${info.expected}`);
  }
  console.log('\nDetalle por región:');
  for (const { region, names, expected, actual } of summary) {
    console.log(`\n${region} (${actual}/${expected})`);
    console.log(names.join(', '));
  }
}
