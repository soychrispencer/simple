import fs from 'fs';
import path from 'path';

const filePath = path.resolve('backend', 'supabase', 'migrations', '20251114000001_seed_data_complete.sql');
const sql = fs.readFileSync(filePath, 'utf8');

const modelPattern = /\(\(SELECT id FROM public\.brands WHERE name = '([^']+)'\), '([^']+)', \(SELECT id FROM public\.vehicle_types WHERE name = '([^']+)'(?: LIMIT 1)?\), ([^,\)]+), ([^\)]+)\)/g;

const entries = [];
const seen = new Set();
let match;

while ((match = modelPattern.exec(sql)) !== null) {
  const [, brand, model, type, yearFrom, yearTo] = match;
  const key = `${brand}||${model}`;
  if (seen.has(key)) continue;
  seen.add(key);
  entries.push({
    brand,
    model,
    type,
    yearFrom: yearFrom.trim(),
    yearTo: yearTo.trim(),
  });
}

if (!entries.length) {
  throw new Error('No se encontraron modelos para reorganizar.');
}

const typeOrder = ['Auto', 'SUV', 'Pickup', 'Van', 'Moto', 'Camión', 'Bus', 'Maquinaria', 'Otro'];
const pluralLabels = {
  Auto: 'Autos',
  SUV: 'SUVs',
  Pickup: 'Pickups',
  Van: 'Vans',
  Moto: 'Motos',
  'Camión': 'Camiones',
  Bus: 'Buses',
  Maquinaria: 'Maquinaria',
  Otro: 'Otros',
};

const grouped = new Map();
typeOrder.forEach((type) => grouped.set(type, []));
entries.forEach((entry) => {
  if (!grouped.has(entry.type)) {
    grouped.set(entry.type, []);
  }
  grouped.get(entry.type).push(entry);
});

for (const [, models] of grouped) {
  models.sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand);
    if (brandCompare !== 0) return brandCompare;
    return a.model.localeCompare(b.model);
  });
}

const escapeSql = (value) => value.replace(/'/g, "''");

const lines = [];
lines.push('-- ===========================================');
lines.push('-- MODELOS POR TIPO DE VEHÍCULO');
lines.push('-- ===========================================');
lines.push('');
lines.push('DO $$');
lines.push('BEGIN');

for (const type of typeOrder) {
  const models = grouped.get(type) || [];
  if (!models.length) continue;
  const label = pluralLabels[type] || `${type}s`;
  lines.push(`    -- ${label}`);
  lines.push('    INSERT INTO public.models (brand_id, name, vehicle_type_id, year_from, year_to) VALUES');
  models.forEach((entry, idx) => {
    const suffix = idx === models.length - 1 ? '' : ',';
    lines.push(
      `        ((SELECT id FROM public.brands WHERE name = '${escapeSql(entry.brand)}'), '${escapeSql(entry.model)}', (SELECT id FROM public.vehicle_types WHERE name = '${entry.type}' LIMIT 1), ${entry.yearFrom}, ${entry.yearTo})${suffix}`
    );
  });
  lines.push('    ON CONFLICT (brand_id, name) DO NOTHING;');
  lines.push('');
}

lines.push('END;');
lines.push('$$ LANGUAGE plpgsql;');
lines.push('');

const block = lines.join('\r\n');
const startMarker = '-- ===========================================\r\n-- MODELOS POR TIPO DE VEHÍCULO';
const endMarker = '-- Asegurar que la columna features';
const startIdx = sql.indexOf(startMarker);
if (startIdx === -1) {
  throw new Error('No se encontró el inicio del bloque de modelos.');
}
const endIdx = sql.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  throw new Error('No se encontró el final del bloque de modelos.');
}
const newSql = sql.slice(0, startIdx) + block + '\r\n' + sql.slice(endIdx);
fs.writeFileSync(filePath, newSql, 'utf8');
console.log(`Se reorganizaron ${entries.length} modelos por tipo de vehículo.`);
