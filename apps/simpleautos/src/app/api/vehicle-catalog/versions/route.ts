import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

export const runtime = 'nodejs';

type CarQueryTrim = {
    model_id?: string;
    model_name?: string;
    model_trim?: string;
    model_year?: string;
    model_body?: string;
    model_engine_cc?: string;
    model_transmission_type?: string;
    model_drive?: string;
};

type SeedBrand = {
    id?: string;
    name?: string;
    vehicle_types?: string[];
};

type SeedModel = {
    id?: string;
    brand_id?: string;
    name?: string;
    vehicle_types?: string[];
};

type SeedVersion = {
    id?: string;
    brand_id?: string;
    model_id?: string;
    name?: string;
    year?: string;
    vehicle_types?: string[];
};

type SeedCatalog = {
    brands?: SeedBrand[];
    models?: SeedModel[];
    versions?: SeedVersion[];
};

const USER_AGENT = 'Mozilla/5.0';
const versionCache = new Map<string, { source: string; versions: Array<{ id: string; name: string; year?: string }> }>();
const execFileAsync = promisify(execFile);
let seedCatalogPromise: Promise<SeedCatalog | null> | null = null;

function normalizeText(value: string) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function slugify(value: string) {
    return normalizeText(value).replace(/\s+/g, '-');
}

function mergeVersionLists(...groups: Array<Array<{ id: string; name: string; year?: string }>>) {
    const seen = new Set<string>();
    return groups
        .flat()
        .filter((row) => {
            const key = `${normalizeText(row.name)}|${row.year || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => {
            const yearCompare = String(a.year || '').localeCompare(String(b.year || ''), 'es');
            if (yearCompare !== 0) return yearCompare;
            return a.name.localeCompare(b.name, 'es');
        });
}

function formatEngineLiters(engineCc: string | undefined) {
    const numeric = Number(engineCc || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    if (numeric >= 1000) {
        const liters = (numeric / 1000).toFixed(1).replace(/\.0$/, '');
        return `${liters}L`;
    }
    return `${numeric}cc`;
}

function formatTransmission(value: string | undefined) {
    const source = String(value || '').trim();
    if (!source) return '';
    const normalized = source.toLowerCase();
    const speedMatch = normalized.match(/(\d+)\s*-\s*speed|(\d+)\s*speed/);
    const speed = speedMatch?.[1] || speedMatch?.[2] || '';
    if (normalized.includes('manual')) return speed ? `${speed}MT` : 'MT';
    if (normalized.includes('automatic')) return speed ? `${speed}AT` : 'AT';
    if (normalized.includes('dual') || normalized.includes('dct')) return speed ? `${speed}DCT` : 'DCT';
    if (normalized.includes('single speed')) return '1AT';
    if (normalized.includes('cvt')) return 'CVT';
    return source;
}

function formatDrive(value: string | undefined) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === 'front') return 'FWD';
    if (normalized === 'rear') return 'RWD';
    if (normalized === 'all') return 'AWD';
    if (normalized.includes('4')) return '4WD';
    return '';
}

function buildVersionLabel(trim: CarQueryTrim) {
    const base = String(trim.model_trim || '').trim();
    const liters = formatEngineLiters(trim.model_engine_cc);
    const transmission = formatTransmission(trim.model_transmission_type);
    const drive = formatDrive(trim.model_drive);

    return [base, liters, transmission, drive].filter(Boolean).join(' ').trim();
}

function uniqueVersionRows(rows: CarQueryTrim[]) {
    const counts = new Map<string, number>();
    const baseRows = rows
        .map((trim) => ({
            trim,
            name: buildVersionLabel(trim),
        }))
        .filter((item) => item.name);

    for (const row of baseRows) {
        counts.set(row.name, (counts.get(row.name) || 0) + 1);
    }

    const seen = new Set<string>();
    return baseRows
        .map((row) => {
            const body = String(row.trim.model_body || '').trim();
            const finalName = counts.get(row.name)! > 1 && body ? `${row.name} ${body}` : row.name;
            return {
                id: slugify(finalName),
                name: finalName,
                year: String(row.trim.model_year || '').trim() || undefined,
            };
        })
        .filter((row) => {
            if (seen.has(row.id)) return false;
            seen.add(row.id);
            return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

async function fetchCarQueryJson(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'user-agent': USER_AGENT,
                accept: 'application/json',
            },
            cache: 'no-store',
        });
        if (response.ok) {
            return response.json() as Promise<{ Trims?: CarQueryTrim[] }>;
        }
    } catch {
        // Fallback below.
    }

    const { stdout } = await execFileAsync('curl.exe', ['-s', '-L', '-A', USER_AGENT, url], {
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
    });
    return JSON.parse(stdout) as { Trims?: CarQueryTrim[] };
}

function buildModelCandidates(model: string) {
    const candidates = new Set<string>([model.trim()]);
    candidates.add(model.replace(/-/g, ' ').trim());
    candidates.add(model.replace(/\s+/g, '-').trim());
    candidates.add(model.replace(/\s*\(.+?\)\s*/g, ' ').trim());
    return Array.from(candidates).filter(Boolean);
}

async function loadSeedCatalog() {
    if (!seedCatalogPromise) {
        seedCatalogPromise = readFile(path.join(process.cwd(), 'public', 'seeds', 'simpleautos-catalog.json'), 'utf8')
            .then((raw) => JSON.parse(raw) as SeedCatalog)
            .catch(() => null);
    }
    return seedCatalogPromise;
}

async function getSeedVersions(
    brand: string,
    model: string,
    year: string,
    vehicleType: string
): Promise<Array<{ id: string; name: string; year?: string }>> {
    const seed = await loadSeedCatalog();
    if (!seed?.brands?.length || !seed?.models?.length || !seed?.versions?.length) return [];

    const brandIds = new Set(
        seed.brands
            .filter((item) => normalizeText(String(item.name || '')) === normalizeText(brand))
            .filter((item) => !vehicleType || !item.vehicle_types?.length || item.vehicle_types.includes(vehicleType))
            .map((item) => String(item.id || ''))
            .filter(Boolean)
    );
    if (brandIds.size === 0) return [];

    const modelIds = new Set(
        seed.models
            .filter((item) => brandIds.has(String(item.brand_id || '')))
            .filter((item) => normalizeText(String(item.name || '')) === normalizeText(model))
            .filter((item) => !vehicleType || !item.vehicle_types?.length || item.vehicle_types.includes(vehicleType))
            .map((item) => String(item.id || ''))
            .filter(Boolean)
    );
    if (modelIds.size === 0) return [];

    return mergeVersionLists(
        seed.versions
            .filter((item) => modelIds.has(String(item.model_id || '')))
            .filter((item) => !vehicleType || !item.vehicle_types?.length || item.vehicle_types.includes(vehicleType))
            .filter((item) => !year || !item.year || String(item.year) === year)
            .map((item) => ({
                id: String(item.id || slugify(String(item.name || ''))),
                name: String(item.name || '').trim(),
                year: String(item.year || '').trim() || undefined,
            }))
            .filter((item) => item.name)
    );
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const brand = String(searchParams.get('brand') || '').trim();
    const model = String(searchParams.get('model') || '').trim();
    const year = String(searchParams.get('year') || '').trim();
    const vehicleType = String(searchParams.get('vehicleType') || '').trim();

    if (!brand || !model || !year) {
        return NextResponse.json({ source: 'invalid', versions: [] }, { status: 400 });
    }

    const cacheKey = `${brand}|${model}|${year}|${vehicleType || 'all'}`;
    const cached = versionCache.get(cacheKey);
    if (cached) {
        return NextResponse.json(cached, {
            headers: {
                'Cache-Control': 'private, max-age=3600',
            },
        });
    }

    const seedVersions = await getSeedVersions(brand, model, year, vehicleType);

    let carQueryVersions: Array<{ id: string; name: string; year?: string }> = [];
    if (!vehicleType || vehicleType === 'car') {
        for (const candidate of buildModelCandidates(model)) {
            const payload = await fetchCarQueryJson(
                `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&make=${encodeURIComponent(brand)}&model=${encodeURIComponent(candidate)}&year=${encodeURIComponent(year)}`
            );
            const trims = Array.isArray(payload.Trims) ? payload.Trims : [];
            carQueryVersions = uniqueVersionRows(trims);
            if (carQueryVersions.length > 0) break;
        }
    }

    const versions = mergeVersionLists(seedVersions, carQueryVersions);
    const result = {
        source:
            versions.length === 0
                ? 'empty'
                : seedVersions.length > 0 && carQueryVersions.length > 0
                  ? 'seed+carquery'
                  : seedVersions.length > 0
                    ? 'seed'
                    : 'carquery',
        versions,
    };
    versionCache.set(cacheKey, result);

    return NextResponse.json(result, {
        headers: {
            'Cache-Control': 'private, max-age=3600',
        },
    });
}
