export type VehicleCatalogType =
    | 'car'
    | 'motorcycle'
    | 'truck'
    | 'bus'
    | 'machinery'
    | 'nautical'
    | 'aerial';

export interface CatalogBrand {
    id: string;
    name: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogModel {
    id: string;
    brandId: string;
    name: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogVersion {
    id: string;
    brandId: string;
    modelId: string;
    name: string;
    year?: string;
    vehicleTypes: VehicleCatalogType[];
}

export interface CatalogRegion {
    id: string;
    name: string;
    code?: string;
}

export interface CatalogCommune {
    id: string;
    regionId: string;
    name: string;
}

export interface PublishWizardCatalog {
    brands: CatalogBrand[];
    models: CatalogModel[];
    versions: CatalogVersion[];
    regions: CatalogRegion[];
    communes: CatalogCommune[];
    source: 'seed-file' | 'fallback';
}

const DEFAULT_TYPES: VehicleCatalogType[] = ['car'];

const FALLBACK_BRANDS: CatalogBrand[] = [
    { id: 'toyota', name: 'Toyota', vehicleTypes: ['car'] },
    { id: 'hyundai', name: 'Hyundai', vehicleTypes: ['car'] },
    { id: 'kia', name: 'Kia', vehicleTypes: ['car'] },
    { id: 'chevrolet', name: 'Chevrolet', vehicleTypes: ['car'] },
    { id: 'nissan', name: 'Nissan', vehicleTypes: ['car'] },
    { id: 'suzuki', name: 'Suzuki', vehicleTypes: ['car'] },
    { id: 'mazda', name: 'Mazda', vehicleTypes: ['car'] },
    { id: 'volkswagen', name: 'Volkswagen', vehicleTypes: ['car'] },
    { id: 'ford', name: 'Ford', vehicleTypes: ['car', 'truck'] },
    { id: 'honda', name: 'Honda', vehicleTypes: ['car', 'motorcycle'] },
    { id: 'bmw', name: 'BMW', vehicleTypes: ['car', 'motorcycle'] },
    { id: 'mercedes', name: 'Mercedes-Benz', vehicleTypes: ['car', 'truck', 'bus'] },
    { id: 'volvo', name: 'Volvo', vehicleTypes: ['car', 'truck', 'bus'] },
    { id: 'scania', name: 'Scania', vehicleTypes: ['truck', 'bus'] },
    { id: 'man', name: 'MAN', vehicleTypes: ['truck', 'bus'] },
    { id: 'yamaha', name: 'Yamaha', vehicleTypes: ['motorcycle', 'nautical'] },
    { id: 'kawasaki', name: 'Kawasaki', vehicleTypes: ['motorcycle', 'nautical'] },
    { id: 'caterpillar', name: 'Caterpillar', vehicleTypes: ['machinery'] },
    { id: 'komatsu', name: 'Komatsu', vehicleTypes: ['machinery'] },
    { id: 'john-deere', name: 'John Deere', vehicleTypes: ['machinery'] },
    { id: 'bayliner', name: 'Bayliner', vehicleTypes: ['nautical'] },
    { id: 'cessna', name: 'Cessna', vehicleTypes: ['aerial'] },
];

const FALLBACK_MODELS: CatalogModel[] = [
    { id: 'toyota-corolla-cross', brandId: 'toyota', name: 'Corolla Cross', vehicleTypes: ['car'] },
    { id: 'toyota-rav4', brandId: 'toyota', name: 'RAV4', vehicleTypes: ['car'] },
    { id: 'toyota-yaris', brandId: 'toyota', name: 'Yaris', vehicleTypes: ['car'] },
    { id: 'toyota-hilux', brandId: 'toyota', name: 'Hilux', vehicleTypes: ['car', 'truck'] },
    { id: 'hyundai-tucson', brandId: 'hyundai', name: 'Tucson', vehicleTypes: ['car'] },
    { id: 'hyundai-accent', brandId: 'hyundai', name: 'Accent', vehicleTypes: ['car'] },
    { id: 'hyundai-santa-fe', brandId: 'hyundai', name: 'Santa Fe', vehicleTypes: ['car'] },
    { id: 'kia-sportage', brandId: 'kia', name: 'Sportage', vehicleTypes: ['car'] },
    { id: 'kia-rio', brandId: 'kia', name: 'Rio', vehicleTypes: ['car'] },
    { id: 'kia-seltos', brandId: 'kia', name: 'Seltos', vehicleTypes: ['car'] },
    { id: 'nissan-versa', brandId: 'nissan', name: 'Versa', vehicleTypes: ['car'] },
    { id: 'nissan-xtrail', brandId: 'nissan', name: 'X-Trail', vehicleTypes: ['car'] },
    { id: 'nissan-navara', brandId: 'nissan', name: 'Navara', vehicleTypes: ['car', 'truck'] },
    { id: 'chevrolet-onix', brandId: 'chevrolet', name: 'Onix', vehicleTypes: ['car'] },
    { id: 'chevrolet-tracker', brandId: 'chevrolet', name: 'Tracker', vehicleTypes: ['car'] },
    { id: 'chevrolet-dmax', brandId: 'chevrolet', name: 'D-Max', vehicleTypes: ['car', 'truck'] },
    { id: 'ford-ranger', brandId: 'ford', name: 'Ranger', vehicleTypes: ['car', 'truck'] },
    { id: 'ford-territory', brandId: 'ford', name: 'Territory', vehicleTypes: ['car'] },
    { id: 'honda-civic', brandId: 'honda', name: 'Civic', vehicleTypes: ['car'] },
    { id: 'honda-hrv', brandId: 'honda', name: 'HR-V', vehicleTypes: ['car'] },
    { id: 'bmw-320i', brandId: 'bmw', name: '320i', vehicleTypes: ['car'] },
    { id: 'bmw-x1', brandId: 'bmw', name: 'X1', vehicleTypes: ['car'] },
    { id: 'mercedes-c200', brandId: 'mercedes', name: 'C200', vehicleTypes: ['car'] },
    { id: 'mercedes-sprinter', brandId: 'mercedes', name: 'Sprinter', vehicleTypes: ['truck', 'bus'] },
    { id: 'volvo-fh', brandId: 'volvo', name: 'FH', vehicleTypes: ['truck'] },
    { id: 'scania-r450', brandId: 'scania', name: 'R450', vehicleTypes: ['truck'] },
    { id: 'man-tgx', brandId: 'man', name: 'TGX', vehicleTypes: ['truck'] },
    { id: 'yamaha-mt07', brandId: 'yamaha', name: 'MT-07', vehicleTypes: ['motorcycle'] },
    { id: 'kawasaki-z900', brandId: 'kawasaki', name: 'Z900', vehicleTypes: ['motorcycle'] },
    { id: 'cat-320', brandId: 'caterpillar', name: '320 Excavator', vehicleTypes: ['machinery'] },
    { id: 'komatsu-pc200', brandId: 'komatsu', name: 'PC200', vehicleTypes: ['machinery'] },
    { id: 'jd-5075e', brandId: 'john-deere', name: '5075E', vehicleTypes: ['machinery'] },
    { id: 'bayliner-vr5', brandId: 'bayliner', name: 'VR5', vehicleTypes: ['nautical'] },
    { id: 'cessna-172', brandId: 'cessna', name: '172 Skyhawk', vehicleTypes: ['aerial'] },
];

const FALLBACK_REGIONS: CatalogRegion[] = [
    { id: 'cl-15', name: 'Arica y Parinacota', code: '15' },
    { id: 'cl-01', name: 'Tarapacá', code: '1' },
    { id: 'cl-02', name: 'Antofagasta', code: '2' },
    { id: 'cl-03', name: 'Atacama', code: '3' },
    { id: 'cl-04', name: 'Coquimbo', code: '4' },
    { id: 'cl-05', name: 'Valparaíso', code: '5' },
    { id: 'cl-13', name: 'Región Metropolitana', code: '13' },
    { id: 'cl-06', name: "O'Higgins", code: '6' },
    { id: 'cl-07', name: 'Maule', code: '7' },
    { id: 'cl-16', name: 'Ñuble', code: '16' },
    { id: 'cl-08', name: 'Biobío', code: '8' },
    { id: 'cl-09', name: 'Araucanía', code: '9' },
    { id: 'cl-14', name: 'Los Ríos', code: '14' },
    { id: 'cl-10', name: 'Los Lagos', code: '10' },
    { id: 'cl-11', name: 'Aysén', code: '11' },
    { id: 'cl-12', name: 'Magallanes y Antártica Chilena', code: '12' },
];

const FALLBACK_COMMUNES: CatalogCommune[] = [
    { id: 'rm-las-condes', regionId: 'cl-13', name: 'Las Condes' },
    { id: 'rm-providencia', regionId: 'cl-13', name: 'Providencia' },
    { id: 'rm-nunoa', regionId: 'cl-13', name: 'Ñuñoa' },
    { id: 'rm-santiago', regionId: 'cl-13', name: 'Santiago' },
    { id: 'rm-maipu', regionId: 'cl-13', name: 'Maipú' },
    { id: 'rm-puente-alto', regionId: 'cl-13', name: 'Puente Alto' },
    { id: 'v-vina', regionId: 'cl-05', name: 'Viña del Mar' },
    { id: 'v-valpo', regionId: 'cl-05', name: 'Valparaíso' },
    { id: 'v-quilpue', regionId: 'cl-05', name: 'Quilpué' },
    { id: 'v-concon', regionId: 'cl-05', name: 'Concón' },
    { id: 'v-san-antonio', regionId: 'cl-05', name: 'San Antonio' },
    { id: 'bio-conce', regionId: 'cl-08', name: 'Concepción' },
    { id: 'bio-talcahuano', regionId: 'cl-08', name: 'Talcahuano' },
    { id: 'bio-los-angeles', regionId: 'cl-08', name: 'Los Ángeles' },
    { id: 'bio-chillan', regionId: 'cl-08', name: 'Chillán' },
    { id: 'coq-serena', regionId: 'cl-04', name: 'La Serena' },
    { id: 'coq-coquimbo', regionId: 'cl-04', name: 'Coquimbo' },
    { id: 'coq-ovalle', regionId: 'cl-04', name: 'Ovalle' },
    { id: 'ara-temuco', regionId: 'cl-09', name: 'Temuco' },
    { id: 'ara-villarrica', regionId: 'cl-09', name: 'Villarrica' },
    { id: 'ara-puco', regionId: 'cl-09', name: 'Pucón' },
    { id: 'll-pmontt', regionId: 'cl-10', name: 'Puerto Montt' },
    { id: 'll-osorno', regionId: 'cl-10', name: 'Osorno' },
    { id: 'll-castro', regionId: 'cl-10', name: 'Castro' },
];

const CATALOG_PATHS = [
    '/seeds/simpleautos-catalog.json',
    '/seeds/autos-catalog.json',
    '/seeds/supabase-autos-catalog.json',
];

const GENERIC_VERSION_OPTIONS_BY_TYPE: Record<VehicleCatalogType, string[]> = {
    car: ['Base', 'Comfort', 'Full', 'Manual', 'Automático', 'Turbo', 'Hybrid', '4x4'],
    motorcycle: ['Standard', 'ABS', 'Adventure', 'Touring', 'Sport', 'Naked'],
    truck: ['4x2', '6x2', '6x4', 'Tracto', 'Tolva', 'Furgón'],
    bus: ['Urbano', 'Interurbano', 'Escolar', 'Turismo', 'Midi', 'Minibús'],
    machinery: ['Standard', 'Cabina', 'Oruga', 'Ruedas', 'Retroexcavadora', 'Excavadora'],
    nautical: ['Open', 'Cabinada', 'Sport', 'Pesca', 'Touring'],
    aerial: ['Standard', 'Glass Cockpit', 'Training', 'Utility'],
};

const CURATED_VERSION_OPTIONS_BY_MODEL_KEY: Record<string, string[]> = {
    'toyota:corolla': ['XLi', 'GLi', 'SE-G', 'Hybrid', 'GR-S'],
    'toyota:corolla cross': ['Xi', 'XEi', 'SEG', 'Hybrid', 'GR-S'],
    'toyota:rav4': ['LE', 'XLE', 'Limited', 'Adventure', 'Hybrid'],
    'toyota:yaris': ['Sport', 'XLi', 'GLi', 'XS', 'XLS'],
    'toyota:hilux': ['DX', 'SR', 'SRV', 'SRX', 'GR-S'],
    'hyundai:accent': ['GL', 'GLS', 'MT', 'AT'],
    'hyundai:tucson': ['GL', 'GLS', 'Limited', 'Hybrid'],
    'hyundai:santa fe': ['Value', 'Premium', 'Limited', 'Calligraphy', 'Hybrid'],
    'kia:rio': ['LX', 'EX', 'Sedán', 'HB'],
    'kia:sportage': ['LX', 'EX', 'SX', 'GT-Line', 'X-Line'],
    'kia:seltos': ['LX', 'EX', 'SX', 'GT-Line'],
    'nissan:versa': ['Sense', 'Advance', 'Exclusive'],
    'nissan:qashqai': ['Sense', 'Advance', 'Exclusive', 'Tekna', 'e-POWER'],
    'nissan:x trail': ['Sense', 'Advance', 'Exclusive', 'e-POWER'],
    'nissan:navara': ['SE', 'XE', 'LE', 'PRO-4X'],
    'chevrolet:captiva': ['II LS 2.4L 6MT', 'II LS 2.4L 6AT', 'II LT 2.4L 6AT', 'II LTZ 2.4L 6AT', 'Premier 1.5T CVT'],
    'chevrolet:sail': ['LS 1.4L 5MT', 'LT 1.4L 5MT', 'LT 1.4L 5AT', 'LTZ 1.5L 5MT'],
    'chevrolet:onix': ['LS', 'LT', 'LTZ', 'Premier', 'RS'],
    'chevrolet:tracker': ['LS', 'LT', 'LTZ', 'Premier', 'RS'],
    'chevrolet:d max': ['E2', 'E3', 'E4', 'X-Terrain', '4x4'],
    'hyundai:creta': ['Plus', 'GL', 'GLS', 'Premium', 'Limited'],
    'ford:ranger': ['XL', 'XLS', 'XLT', 'Limited', 'Raptor'],
    'ford:focus': ['S 2.0L 5MT', 'SE 2.0L 5MT', 'SE Plus 2.0L 6AT', 'Titanium 2.0L 6AT', 'ST 2.0T 6MT'],
    'ford:territory': ['SEL', 'Titanium'],
    'honda:civic': ['LX', 'EX', 'Touring', 'Si', 'Hybrid'],
    'honda:hr v': ['LX', 'EX', 'Touring', 'Advance'],
    'kia:morning': ['EX 1.0L MT', 'EX 1.2L MT', 'EX 1.2L AT', 'GT-Line 1.2L AT'],
    'bmw:320i': ['Sport', 'Executive', 'M Sport'],
    'bmw:x1': ['sDrive18i', 'sDrive20i', 'xDrive25e', 'M Sport'],
    'mazda:cx 5': ['R 2.0', 'R 2.5', 'High 2.5', 'Signature 2.5T'],
    'mercedes-benz:c200': ['Avantgarde', 'Exclusive', 'AMG Line'],
    'mercedes-benz:sprinter': ['315 CDI', '415 CDI', '515 CDI', 'Furgón', 'Minibús'],
    'volkswagen:gol': ['Trendline 1.6', 'Comfortline 1.6', 'Highline 1.6'],
    'volkswagen:amarok': ['Trendline 2.0TDI', 'Comfortline 2.0TDI', 'Highline V6 3.0TDI', 'Extreme V6 3.0TDI'],
    'volvo:fh': ['420', '460', '500', '540', '6x2', '6x4'],
    'scania:r450': ['Highline', 'Topline', '4x2', '6x2', '6x4'],
    'man:tgx': ['18.510', '18.540', '26.440', '6x2'],
    'yamaha:mt 07': ['Standard', 'ABS', 'Pure', 'HO'],
    'kawasaki:z900': ['Standard', 'SE', 'Performance'],
    'caterpillar:320 excavator': ['GC', 'Standard', 'Next Gen'],
    'komatsu:pc200': ['LC', 'LC-8', 'LC-11'],
    'john-deere:5075e': ['2WD', '4WD', 'Cabina'],
};

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function toId(value: unknown, fallbackPrefix: string, index: number): string {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
    return `${fallbackPrefix}-${index + 1}`;
}

function normalizeVehicleTypes(raw: unknown): VehicleCatalogType[] {
    const source = asArray<string>(raw);
    if (source.length === 0) return [...DEFAULT_TYPES];
    const normalized = source
        .map((value) => String(value || '').trim().toLowerCase())
        .map((value) => {
            if (value === 'industrial') return 'machinery';
            if (value === 'auto' || value === 'suv' || value === 'pickup' || value === 'van') return 'car';
            if (value === 'moto') return 'motorcycle';
            return value;
        })
        .filter((value): value is VehicleCatalogType => {
            return (
                value === 'car' ||
                value === 'motorcycle' ||
                value === 'truck' ||
                value === 'bus' ||
                value === 'machinery' ||
                value === 'nautical' ||
                value === 'aerial'
            );
        });
    return normalized.length > 0 ? Array.from(new Set(normalized)) : [...DEFAULT_TYPES];
}

function normalizeCatalogText(value: string) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function buildVersionKey(brandId: string, modelName: string) {
    return `${brandId}:${normalizeCatalogText(modelName)}`;
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
    });
}

function buildSupplementalVersions(models: CatalogModel[], existingVersions: CatalogVersion[] = []): CatalogVersion[] {
    const existingByModel = new Set(existingVersions.map((version) => `${version.modelId}:${normalizeCatalogText(version.name)}`));
    const rows: CatalogVersion[] = [];

    for (const model of models) {
        const curatedOptions = CURATED_VERSION_OPTIONS_BY_MODEL_KEY[buildVersionKey(model.brandId, model.name)];
        const genericOptions = GENERIC_VERSION_OPTIONS_BY_TYPE[model.vehicleTypes[0] || 'car'];
        const options = curatedOptions && curatedOptions.length > 0 ? curatedOptions : genericOptions;

        for (const option of options) {
            const dedupeKey = `${model.id}:${normalizeCatalogText(option)}`;
            if (existingByModel.has(dedupeKey)) continue;
            rows.push({
                id: `${model.id}-${normalizeCatalogText(option).replace(/\s+/g, '-')}`,
                brandId: model.brandId,
                modelId: model.id,
                name: option,
                year: undefined,
                vehicleTypes: model.vehicleTypes,
            });
            existingByModel.add(dedupeKey);
        }
    }

    return rows;
}

function normalizeCatalogPayload(payload: unknown): Omit<PublishWizardCatalog, 'source'> | null {
    if (!payload || typeof payload !== 'object') return null;
    const objectPayload = payload as Record<string, unknown>;
    const brandsInput = asArray<Record<string, unknown>>(objectPayload.brands);
    const modelsInput = asArray<Record<string, unknown>>(objectPayload.models);
    const versionsInput = asArray<Record<string, unknown>>(objectPayload.versions);
    const regionsInput = asArray<Record<string, unknown>>(objectPayload.regions ?? objectPayload.regiones);
    const communesInput = asArray<Record<string, unknown>>(objectPayload.communes ?? objectPayload.comunas);

    const normalizedBrands = uniqueById(
        brandsInput
            .map((brand, index) => ({
                id: toId(brand.id ?? brand.brand_id, 'brand', index),
                name: String(brand.name ?? brand.brand_name ?? '').trim(),
                vehicleTypes: normalizeVehicleTypes(brand.vehicle_types),
            }))
            .filter((brand) => brand.name)
    );

    const normalizedModels = uniqueById(
        modelsInput
            .map((model, index) => ({
                id: toId(model.id ?? model.model_id, 'model', index),
                brandId: toId(model.brand_id ?? model.brandId, 'brand', index),
                name: String(model.name ?? model.model_name ?? '').trim(),
                vehicleTypes: normalizeVehicleTypes(model.vehicle_types),
            }))
            .filter((model) => model.name && model.brandId)
    );

    const normalizedVersions = uniqueById(
        versionsInput
            .map((version, index) => ({
                id: toId(version.id ?? version.version_id, 'version', index),
                brandId: toId(version.brand_id ?? version.brandId, 'brand', index),
                modelId: toId(version.model_id ?? version.modelId, 'model', index),
                name: String(version.name ?? version.version_name ?? version.trim_name ?? '').trim(),
                year: String(version.year ?? version.model_year ?? '').trim() || undefined,
                vehicleTypes: normalizeVehicleTypes(version.vehicle_types),
            }))
            .filter((version) => version.name && version.modelId && version.brandId)
    );

    const normalizedRegions = uniqueById(
        regionsInput
            .map((region, index) => ({
                id: toId(region.id ?? region.region_id, 'region', index),
                name: String(region.name ?? region.region_name ?? '').trim(),
                code: String(region.code ?? '').trim() || undefined,
            }))
            .filter((region) => region.name)
    );

    const normalizedCommunes = uniqueById(
        communesInput
            .map((commune, index) => ({
                id: toId(commune.id ?? commune.commune_id, 'commune', index),
                regionId: toId(commune.region_id ?? commune.regionId, 'region', index),
                name: String(commune.name ?? commune.commune_name ?? '').trim(),
            }))
            .filter((commune) => commune.name && commune.regionId)
    );

    if (
        normalizedBrands.length === 0 &&
        normalizedModels.length === 0 &&
        normalizedVersions.length === 0 &&
        normalizedRegions.length === 0 &&
        normalizedCommunes.length === 0
    ) {
        return null;
    }

    const baseModels = normalizedModels.length > 0 ? normalizedModels : FALLBACK_MODELS;
    const mergedVersions = uniqueById([
        ...normalizedVersions,
        ...buildSupplementalVersions(baseModels, normalizedVersions),
    ]);

    return {
        brands: normalizedBrands.length > 0 ? normalizedBrands : FALLBACK_BRANDS,
        models: baseModels,
        versions: mergedVersions,
        regions: normalizedRegions.length > 0 ? normalizedRegions : FALLBACK_REGIONS,
        communes: normalizedCommunes.length > 0 ? normalizedCommunes : FALLBACK_COMMUNES,
    };
}

export async function loadPublishWizardCatalog(signal?: AbortSignal): Promise<PublishWizardCatalog> {
    for (const path of CATALOG_PATHS) {
        try {
            const response = await fetch(path, {
                method: 'GET',
                cache: 'no-store',
                signal,
            });
            if (!response.ok) continue;
            const payload = await response.json();
            const normalized = normalizeCatalogPayload(payload);
            if (normalized) {
                return { ...normalized, source: 'seed-file' };
            }
        } catch {
            // Fallback local if seed file is absent or invalid.
        }
    }

    return {
        brands: FALLBACK_BRANDS,
        models: FALLBACK_MODELS,
        versions: buildSupplementalVersions(FALLBACK_MODELS),
        regions: FALLBACK_REGIONS,
        communes: FALLBACK_COMMUNES,
        source: 'fallback',
    };
}

export function getBrandsForVehicleType(
    catalog: PublishWizardCatalog,
    vehicleType: VehicleCatalogType
): CatalogBrand[] {
    return catalog.brands
        .filter((brand) => brand.vehicleTypes.includes(vehicleType))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getModelsForBrand(
    catalog: PublishWizardCatalog,
    brandId: string,
    vehicleType: VehicleCatalogType
): CatalogModel[] {
    if (!brandId) return [];
    return catalog.models
        .filter((model) => model.brandId === brandId)
        .filter((model) => model.vehicleTypes.includes(vehicleType))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getVersionsForModel(
    catalog: PublishWizardCatalog,
    modelId: string,
    vehicleType: VehicleCatalogType,
    year?: string
): CatalogVersion[] {
    if (!modelId) return [];
    return catalog.versions
        .filter((version) => version.modelId === modelId)
        .filter((version) => version.vehicleTypes.includes(vehicleType))
        .filter((version) => !year || !version.year || version.year === year)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getCommunesForRegion(catalog: PublishWizardCatalog, regionId: string): CatalogCommune[] {
    if (!regionId) return [];
    return catalog.communes
        .filter((commune) => commune.regionId === regionId)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
