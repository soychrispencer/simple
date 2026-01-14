#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function parseDotenv(contents) {
  const env = {};
  const lines = contents.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
  return env;
}

function loadEnvFile(envPath) {
  const abs = path.resolve(envPath);
  if (!fs.existsSync(abs)) {
    return { loaded: false, absPath: abs };
  }
  const parsed = parseDotenv(fs.readFileSync(abs, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key] && value != null) {
      process.env[key] = value;
    }
  }
  return { loaded: true, absPath: abs };
}

function escapePipe(value) {
  return String(value).replaceAll('|', '\\|');
}

function toMarkdownTable(headers, rows) {
  const head = `| ${headers.map(escapePipe).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(escapePipe).join(' | ')} |`).join('\n');
  return [head, sep, body].filter(Boolean).join('\n');
}

async function fetchAll(supabase, table, columns) {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) {
      throw new Error(`Error leyendo ${table}: ${error.message}`);
    }
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function sortByLocale(a, b) {
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
}

function buildAudit({ vehicleTypes, brands, models }) {
  const vehicleTypeById = new Map(vehicleTypes.map((v) => [v.id, v]));
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  const legacySlugs = new Set(['suv', 'pickup', 'van', 'otro']);
  const legacyTypes = vehicleTypes
    .filter((vt) => legacySlugs.has(vt.slug))
    .map((vt) => ({ id: vt.id, slug: vt.slug, name: vt.name, category: vt.category, sort_order: vt.sort_order }));

  const modelsByTypeId = new Map();
  const brandsByTypeId = new Map();
  const brandCountsByTypeId = new Map();
  const duplicatesMap = new Map();

  for (const m of models) {
    const typeId = m.vehicle_type_id;
    const brandId = m.brand_id;
    if (!typeId || !brandId) continue;

    if (!modelsByTypeId.has(typeId)) modelsByTypeId.set(typeId, 0);
    modelsByTypeId.set(typeId, modelsByTypeId.get(typeId) + 1);

    if (!brandsByTypeId.has(typeId)) brandsByTypeId.set(typeId, new Set());
    brandsByTypeId.get(typeId).add(brandId);

    if (!brandCountsByTypeId.has(typeId)) brandCountsByTypeId.set(typeId, new Map());
    const byBrand = brandCountsByTypeId.get(typeId);
    byBrand.set(brandId, (byBrand.get(brandId) || 0) + 1);

    const modelName = (m.name || '').trim();
    if (modelName) {
      const dupKey = `${typeId}::${brandId}::${modelName.toLowerCase()}`;
      duplicatesMap.set(dupKey, (duplicatesMap.get(dupKey) || 0) + 1);
    }
  }

  const perType = vehicleTypes
    .map((vt) => {
      const modelsCount = modelsByTypeId.get(vt.id) || 0;
      const distinctBrandsCount = brandsByTypeId.get(vt.id)?.size || 0;
      return {
        slug: vt.slug,
        name: vt.name,
        modelsCount,
        distinctBrandsCount,
      };
    })
    .sort((a, b) => b.modelsCount - a.modelsCount || sortByLocale(a.slug, b.slug));

  const zeroModels = perType.filter((x) => x.modelsCount === 0);

  const topBrandsByType = {};
  for (const vt of vehicleTypes) {
    const byBrand = brandCountsByTypeId.get(vt.id);
    if (!byBrand) continue;

    const rows = Array.from(byBrand.entries())
      .map(([brandId, count]) => ({
        brandId,
        brandName: brandNameById.get(brandId) || brandId,
        modelsCount: count,
      }))
      .sort((a, b) => b.modelsCount - a.modelsCount || sortByLocale(a.brandName, b.brandName));

    topBrandsByType[vt.slug] = rows;
  }

  const duplicates = [];
  for (const [key, count] of duplicatesMap.entries()) {
    if (count <= 1) continue;
    const [typeId, brandId, modelNameLower] = key.split('::');
    const vt = vehicleTypeById.get(typeId);
    duplicates.push({
      vehicle_type_slug: vt?.slug || typeId,
      brand_name: brandNameById.get(brandId) || brandId,
      model_name: modelNameLower,
      dup_count: count,
    });
  }
  duplicates.sort((a, b) => b.dup_count - a.dup_count || sortByLocale(a.vehicle_type_slug, b.vehicle_type_slug));

  return {
    legacyTypes,
    perType,
    zeroModels,
    topBrandsByType,
    duplicates,
  };
}

function renderMarkdown(audit, { topLimit }) {
  const lines = [];
  lines.push(`# Catalog audit (automático)`);
  lines.push('');

  lines.push('## 1) Tipos legacy (debería ser 0 filas)');
  if (!audit.legacyTypes.length) {
    lines.push('- OK: no se encontraron slugs legacy.');
  } else {
    lines.push(toMarkdownTable(['id', 'slug', 'name', 'category', 'sort_order'], audit.legacyTypes.map((r) => [r.id, r.slug, r.name, r.category, r.sort_order])));
  }
  lines.push('');

  lines.push('## 2) Cobertura por tipo');
  lines.push(toMarkdownTable(['vehicle_type_slug', 'vehicle_type_name', 'models_count', 'distinct_brands_count'], audit.perType.map((r) => [r.slug, r.name, r.modelsCount, r.distinctBrandsCount])));
  lines.push('');

  lines.push('## 3) Tipos con 0 modelos (debería ser 0 filas)');
  if (!audit.zeroModels.length) {
    lines.push('- OK: todos los tipos tienen al menos 1 modelo.');
  } else {
    lines.push(toMarkdownTable(['vehicle_type_slug', 'vehicle_type_name'], audit.zeroModels.map((r) => [r.slug, r.name])));
  }
  lines.push('');

  lines.push(`## 4) Top ${topLimit} marcas por tipo (por cantidad de modelos)`);
  for (const [typeSlug, rows] of Object.entries(audit.topBrandsByType).sort((a, b) => sortByLocale(a[0], b[0]))) {
    const trimmed = rows.slice(0, topLimit);
    if (!trimmed.length) continue;
    lines.push('');
    lines.push(`### ${typeSlug}`);
    lines.push(toMarkdownTable(['brand_name', 'models_count'], trimmed.map((r) => [r.brandName, r.modelsCount])));
  }
  lines.push('');

  lines.push('## 5) Duplicados potenciales (brand + modelo dentro del tipo)');
  if (!audit.duplicates.length) {
    lines.push('- OK: no se detectaron duplicados.');
  } else {
    lines.push(toMarkdownTable(['vehicle_type_slug', 'brand_name', 'model_name', 'dup_count'], audit.duplicates.map((r) => [r.vehicle_type_slug, r.brand_name, r.model_name, r.dup_count])));
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const envPath = getArgValue('--env') || 'backend/supabase/.env';
  loadEnvFile(envPath);

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Faltan credenciales. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o usa --env backend/supabase/.env).');
    process.exit(1);
  }

  const outPath = getArgValue('--out');
  const topLimitRaw = getArgValue('--top');
  const topLimit = Math.max(1, Math.min(100, Number(topLimitRaw || 30)));
  const json = hasFlag('--json');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const [vehicleTypes, brands, models] = await Promise.all([
    fetchAll(supabase, 'vehicle_types', 'id,slug,name,category,sort_order'),
    fetchAll(supabase, 'brands', 'id,name'),
    fetchAll(supabase, 'models', 'id,brand_id,vehicle_type_id,name'),
  ]);

  const audit = buildAudit({ vehicleTypes, brands, models });

  if (json) {
    const payload = {
      generated_at: new Date().toISOString(),
      summary: {
        legacy_types_count: audit.legacyTypes.length,
        types_with_zero_models: audit.zeroModels.map((x) => x.slug),
      },
      per_type: audit.perType,
      top_brands_by_type: Object.fromEntries(
        Object.entries(audit.topBrandsByType).map(([slug, rows]) => [
          slug,
          rows.slice(0, topLimit).map((r) => ({ brand_name: r.brandName, models_count: r.modelsCount })),
        ])
      ),
      duplicates: audit.duplicates,
    };

    const serialized = JSON.stringify(payload, null, 2);
    if (outPath) {
      fs.writeFileSync(path.resolve(outPath), serialized, 'utf8');
      console.log(`✅ Audit JSON guardado en: ${outPath}`);
    } else {
      console.log(serialized);
    }
    return;
  }

  const md = renderMarkdown(audit, { topLimit });
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), md, 'utf8');
    console.log(`✅ Audit guardado en: ${outPath}`);
  } else {
    console.log(md);
  }
}

main().catch((err) => {
  console.error(`❌ Error: ${err?.message || err}`);
  process.exit(1);
});
