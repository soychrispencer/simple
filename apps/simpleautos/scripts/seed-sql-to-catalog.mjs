import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const seedPath = path.resolve(appRoot, 'seed.txt');
const outputPath = path.resolve(appRoot, 'public', 'seeds', 'simpleautos-catalog.json');

const VEHICLE_TYPE_ORDER = ['car', 'motorcycle', 'truck', 'bus', 'machinery', 'nautical', 'aerial'];

function unescapeSql(value) {
    return String(value ?? '').replace(/''/g, "'").trim();
}

function normalizeKey(value) {
    return unescapeSql(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function slugify(value) {
    return normalizeKey(value).replace(/\s+/g, '-');
}

function toUniqueId(base, usedIds) {
    const normalizedBase = base || 'item';
    let candidate = normalizedBase;
    let suffix = 2;
    while (usedIds.has(candidate)) {
        candidate = `${normalizedBase}-${suffix}`;
        suffix += 1;
    }
    usedIds.add(candidate);
    return candidate;
}

function sortVehicleTypes(types) {
    const source = Array.from(new Set(types));
    return source.sort((a, b) => VEHICLE_TYPE_ORDER.indexOf(a) - VEHICLE_TYPE_ORDER.indexOf(b));
}

function mapVehicleType(rawTypeName) {
    const value = normalizeKey(rawTypeName);
    if (!value) return ['car'];
    if (value.includes('pickup')) return ['car', 'truck'];
    if (value.includes('moto')) return ['motorcycle'];
    if (value.includes('camion') || value.includes('truck')) return ['truck'];
    if (value.includes('bus')) return ['bus'];
    if (value.includes('maquinaria') || value.includes('machinery')) return ['machinery'];
    if (value.includes('naut') || value.includes('boat') || value.includes('marit')) return ['nautical'];
    if (value.includes('aereo') || value.includes('avion') || value.includes('air')) return ['aerial'];
    if (value.includes('suv') || value.includes('auto') || value.includes('van') || value.includes('otro')) return ['car'];
    return ['car'];
}

function extractVehicleTypeAliasMap(sql) {
    const aliases = new Map();
    const blockMatch = sql.match(/INSERT INTO public\.vehicle_types\s*\(name,\s*slug,\s*category\)\s*VALUES([\s\S]*?)ON CONFLICT \(slug\) DO NOTHING;/i);
    if (!blockMatch) return aliases;
    const tupleRegex = /\('((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\)/g;
    for (const tuple of blockMatch[1].matchAll(tupleRegex)) {
        const name = unescapeSql(tuple[1]);
        const slug = unescapeSql(tuple[2]);
        const mapped = mapVehicleType(name);
        aliases.set(normalizeKey(name), mapped);
        aliases.set(normalizeKey(slug), mapped);
    }
    return aliases;
}

function mapVehicleTypeFromSeed(vehicleTypeAliases, rawTypeName) {
    const normalized = normalizeKey(rawTypeName);
    return vehicleTypeAliases.get(normalized) ?? mapVehicleType(rawTypeName);
}

function ensureBrand(brandName, brandsByName, usedBrandIds, preferredTypes = []) {
    const normalizedName = unescapeSql(brandName);
    const key = normalizeKey(normalizedName);
    const existing = brandsByName.get(key);
    if (existing) {
        if (Array.isArray(preferredTypes) && preferredTypes.length > 0) {
            existing.vehicle_types = sortVehicleTypes(Array.from(new Set([...(existing.vehicle_types || []), ...preferredTypes])));
        }
        return existing;
    }
    const brand = {
        id: toUniqueId(slugify(normalizedName), usedBrandIds),
        name: normalizedName,
        vehicle_types: sortVehicleTypes(Array.from(new Set(preferredTypes))),
    };
    brandsByName.set(key, brand);
    return brand;
}

function inferBrandTypesFromSectionLabel(sectionLabel) {
    const normalized = normalizeKey(sectionLabel);
    if (!normalized) return [];
    if (normalized.includes('moto')) return ['motorcycle'];
    if (normalized.includes('camion') || normalized.includes('truck')) return ['truck'];
    if (normalized.includes('bus')) return ['bus'];
    if (normalized.includes('maquinaria') || normalized.includes('machinery') || normalized.includes('industrial')) return ['machinery'];
    if (normalized.includes('naut') || normalized.includes('embarc')) return ['nautical'];
    if (normalized.includes('aereo') || normalized.includes('avion') || normalized.includes('air')) return ['aerial'];
    if (normalized.includes('auto') || normalized.includes('suv') || normalized.includes('pickup') || normalized.includes('van')) return ['car'];
    return [];
}

function getLastBrandSectionLabel(sql, index) {
    const prefix = sql.slice(0, Math.max(0, index));
    const matches = Array.from(prefix.matchAll(/--\s*Marcas?\s+de\s+([^\r\n]+)/gi));
    if (matches.length === 0) return '';
    const last = matches[matches.length - 1];
    return unescapeSql(last[1] || '');
}

function parseBrands(sql) {
    const brandsByName = new Map();
    const usedBrandIds = new Set();
    const seedBrandTypeMap = new Map();
    const brandBlockRegex = /INSERT INTO public\.brands\s*\(name,\s*is_active\)\s*VALUES([\s\S]*?)ON CONFLICT \(name\) DO NOTHING;/gi;
    const tupleRegex = /\('((?:''|[^'])+)'\s*,\s*(?:true|false)\)/gi;

    for (const block of sql.matchAll(brandBlockRegex)) {
        const blockIndex = typeof block.index === 'number' ? block.index : 0;
        const sectionLabel = getLastBrandSectionLabel(sql, blockIndex);
        const inferredTypes = inferBrandTypesFromSectionLabel(sectionLabel);
        for (const tuple of block[1].matchAll(tupleRegex)) {
            const brand = ensureBrand(tuple[1], brandsByName, usedBrandIds, inferredTypes);
            const current = seedBrandTypeMap.get(brand.id) ?? new Set();
            for (const type of inferredTypes) current.add(type);
            seedBrandTypeMap.set(brand.id, current);
        }
    }

    return { brandsByName, usedBrandIds, seedBrandTypeMap };
}

function parseRegions(sql) {
    const regionsByName = new Map();
    const regionVariableToId = new Map();
    const usedRegionIds = new Set();

    const regionBlock = sql.match(/INSERT INTO public\.regions\s*\(name,\s*code\)\s*VALUES([\s\S]*?)ON CONFLICT \(name\) DO NOTHING;/i);
    if (regionBlock) {
        const tupleRegex = /\('((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\)/g;
        for (const tuple of regionBlock[1].matchAll(tupleRegex)) {
            const name = unescapeSql(tuple[1]);
            const code = unescapeSql(tuple[2]);
            const id = toUniqueId(slugify(code || name), usedRegionIds);
            regionsByName.set(normalizeKey(name), { id, name, code });
        }
    }

    const regionVarRegex = /SELECT id INTO\s+([a-z_]+)\s+FROM public\.regions WHERE name = '((?:''|[^'])+)' LIMIT 1;/gi;
    for (const match of sql.matchAll(regionVarRegex)) {
        const variable = match[1];
        const regionName = unescapeSql(match[2]);
        const region = regionsByName.get(normalizeKey(regionName));
        if (region) regionVariableToId.set(variable, region.id);
    }

    return { regionsByName, regionVariableToId, usedRegionIds };
}

function parseCommunes(sql, regionVariableToId) {
    const communes = [];
    const usedCommuneIds = new Set();
    const seen = new Set();

    const blockRegex = /INSERT INTO public\.communes\s*\(name,\s*region_id\)\s*VALUES([\s\S]*?)ON CONFLICT \(name,\s*region_id\) DO NOTHING;/gi;
    const tupleRegex = /\('((?:''|[^'])+)'\s*,\s*([a-z_]+)\)/gi;

    for (const block of sql.matchAll(blockRegex)) {
        for (const tuple of block[1].matchAll(tupleRegex)) {
            const name = unescapeSql(tuple[1]);
            const regionVar = tuple[2];
            const regionId = regionVariableToId.get(regionVar);
            if (!regionId) continue;
            const dedupeKey = `${regionId}|${normalizeKey(name)}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            const id = toUniqueId(`${regionId}-${slugify(name)}`, usedCommuneIds);
            communes.push({ id, region_id: regionId, name });
        }
    }

    return communes;
}

function parseModels(sql, brandsByName, usedBrandIds, vehicleTypeAliases) {
    const modelMap = new Map();
    const usedModelIds = new Set();
    const brandTypeMap = new Map();
    const modelRegex = /\(\(SELECT id FROM public\.brands WHERE name = '((?:''|[^'])+)'\),\s*'((?:''|[^'])+)'\s*,\s*\(SELECT id FROM public\.vehicle_types WHERE name = '((?:''|[^'])+)'\s+LIMIT 1\),\s*\d+,\s*(?:NULL|\d+)\)/gi;

    for (const match of sql.matchAll(modelRegex)) {
        const brandName = unescapeSql(match[1]);
        const modelName = unescapeSql(match[2]);
        const rawVehicleType = unescapeSql(match[3]);
        const brand = ensureBrand(brandName, brandsByName, usedBrandIds);
        const mappedTypes = mapVehicleTypeFromSeed(vehicleTypeAliases, rawVehicleType);
        const modelKey = `${brand.id}|${normalizeKey(modelName)}`;

        if (!modelMap.has(modelKey)) {
            const modelId = toUniqueId(`${brand.id}-${slugify(modelName)}`, usedModelIds);
            modelMap.set(modelKey, {
                id: modelId,
                brand_id: brand.id,
                name: modelName,
                vehicle_types: new Set(),
            });
        }

        const model = modelMap.get(modelKey);
        for (const type of mappedTypes) {
            model.vehicle_types.add(type);
            if (!brandTypeMap.has(brand.id)) brandTypeMap.set(brand.id, new Set());
            brandTypeMap.get(brand.id).add(type);
        }
    }

    return { modelMap, brandTypeMap };
}

async function main() {
    const sql = await fs.readFile(seedPath, 'utf8');
    const vehicleTypeAliases = extractVehicleTypeAliasMap(sql);

    const { brandsByName, usedBrandIds, seedBrandTypeMap } = parseBrands(sql);
    const { regionsByName, regionVariableToId } = parseRegions(sql);
    const communes = parseCommunes(sql, regionVariableToId);
    const { modelMap, brandTypeMap } = parseModels(sql, brandsByName, usedBrandIds, vehicleTypeAliases);

    const brands = Array.from(brandsByName.values())
        .map((brand) => {
            const mergedTypes = sortVehicleTypes(
                Array.from(new Set([...(brandTypeMap.get(brand.id) ?? []), ...(seedBrandTypeMap.get(brand.id) ?? []), ...(brand.vehicle_types || [])]))
            );
            return {
                ...brand,
                vehicle_types: mergedTypes.length > 0 ? mergedTypes : ['car'],
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const models = Array.from(modelMap.values())
        .map((model) => ({
            id: model.id,
            brand_id: model.brand_id,
            name: model.name,
            vehicle_types: sortVehicleTypes(Array.from(model.vehicle_types)),
        }))
        .sort((a, b) => {
            const byBrand = a.brand_id.localeCompare(b.brand_id);
            if (byBrand !== 0) return byBrand;
            return a.name.localeCompare(b.name, 'es');
        });

    const regions = Array.from(regionsByName.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const sortedCommunes = [...communes].sort((a, b) => {
        const byRegion = a.region_id.localeCompare(b.region_id);
        if (byRegion !== 0) return byRegion;
        return a.name.localeCompare(b.name, 'es');
    });

    const payload = {
        generated_at: new Date().toISOString(),
        source: 'apps/simpleautos/seed.txt',
        brands,
        models,
        regions,
        communes: sortedCommunes,
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(`[seed-sql-to-catalog] Catalog generated at: ${outputPath}`);
    console.log(`[seed-sql-to-catalog] Brands: ${brands.length}`);
    console.log(`[seed-sql-to-catalog] Models: ${models.length}`);
    console.log(`[seed-sql-to-catalog] Regions: ${regions.length}`);
    console.log(`[seed-sql-to-catalog] Communes: ${sortedCommunes.length}`);
}

main().catch((error) => {
    console.error('[seed-sql-to-catalog] Failed to generate catalog from seed.txt');
    console.error(error);
    process.exit(1);
});
