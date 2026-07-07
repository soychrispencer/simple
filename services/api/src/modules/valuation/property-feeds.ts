import { asString, asObject } from '../shared/helpers.js';
import type {
    ValuationFeedRecord,
    ValuationHistoricalPoint,
    ValuationFeedSourceStatus,
    ValuationFeedHealth,
    ValuationFeedConnector,
    ValuationFeedConnectorLoadResult,
} from '../shared/types.js';

let countInternalPropiedadesListings: () => number = () => 0;

export function configurePropertyValuationFeeds(deps: {
    countInternalPropiedadesListings: () => number;
}): void {
    countInternalPropiedadesListings = deps.countInternalPropiedadesListings;
}

function parseNumberFromString(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizePropertyType(raw: unknown): string {
    const value = asString(raw).toLowerCase();
    if (value.includes('depto') || value.includes('departamento')) return 'departamento';
    if (value.includes('casa')) return 'casa';
    if (value.includes('oficina')) return 'oficina';
    if (value.includes('local')) return 'local';
    if (value.includes('terreno')) return 'terreno';
    if (value.includes('bodega')) return 'bodega';
    return value || 'propiedad';
}

function feedIdHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}
// ValuationFeedRecord imported from ./modules/shared/index.js

const valuationFeedRecords: ValuationFeedRecord[] = [
    {
        id: 'pm-001',
        source: 'portalinmobiliario_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Pocuro',
        title: 'Departamento 3D 2B Pocuro',
        price: 5250,
        currency: 'UF',
        areaM2: 88,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        addressLabel: 'Pocuro, Providencia',
        url: null,
    },
    {
        id: 'tt-001',
        source: 'toctoc_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Pedro de Valdivia Norte',
        title: 'Departamento remodelado Providencia',
        price: 5480,
        currency: 'UF',
        areaM2: 91,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
        addressLabel: 'Pedro de Valdivia Norte, Providencia',
        url: null,
    },
    {
        id: 'ml-001',
        source: 'mercadolibre_feed',
        operationType: 'rent',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Barrio Italia',
        title: 'Departamento 2D 2B Barrio Italia',
        price: 760000,
        currency: 'CLP',
        areaM2: 70,
        bedrooms: 2,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        addressLabel: 'Barrio Italia, Providencia',
        url: null,
    },
    {
        id: 'pm-002',
        source: 'portalinmobiliario_feed',
        operationType: 'sale',
        propertyType: 'casa',
        regionId: 'rm',
        communeId: 'las-condes',
        neighborhood: 'Los Dominicos',
        title: 'Casa 4D 3B Los Dominicos',
        price: 16800,
        currency: 'UF',
        areaM2: 230,
        bedrooms: 4,
        bathrooms: 3,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
        addressLabel: 'Los Dominicos, Las Condes',
        url: null,
    },
    {
        id: 'tt-002',
        source: 'toctoc_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'nunoa',
        neighborhood: 'Irarrázaval',
        title: 'Departamento 2D 2B Ñuñoa',
        price: 4980,
        currency: 'UF',
        areaM2: 72,
        bedrooms: 2,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
        addressLabel: 'Irarrázaval, Ñuñoa',
        url: null,
    },
    {
        id: 'ml-002',
        source: 'mercadolibre_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'la-florida',
        neighborhood: 'Villa O\'Higgins',
        title: 'Departamento 3D 2B La Florida',
        price: 4120,
        currency: 'UF',
        areaM2: 78,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
        addressLabel: 'Villa O\'Higgins, La Florida',
        url: null,
    },
    {
        id: 'pm-003',
        source: 'portalinmobiliario_feed',
        operationType: 'rent',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'vitacura',
        neighborhood: 'Lo Curro',
        title: 'Departamento 3D 3B Lo Curro',
        price: 1450000,
        currency: 'CLP',
        areaM2: 105,
        bedrooms: 3,
        bathrooms: 3,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        addressLabel: 'Lo Curro, Vitacura',
        url: null,
    },
    {
        id: 'tt-003',
        source: 'toctoc_feed',
        operationType: 'sale',
        propertyType: 'casa',
        regionId: 'rm',
        communeId: 'macul',
        neighborhood: 'Centro Macul',
        title: 'Casa 3D 2B Macul',
        price: 8900,
        currency: 'UF',
        areaM2: 145,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        addressLabel: 'Centro Macul, Macul',
        url: null,
    },
];

const valuationHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = {
    'sale|departamento|rm|providencia': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 5050, medianPricePerM2: 59.2, sampleSize: 18 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 5120, medianPricePerM2: 60.0, sampleSize: 21 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 5180, medianPricePerM2: 60.9, sampleSize: 23 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 5230, medianPricePerM2: 61.5, sampleSize: 25 },
    ],
    'rent|departamento|rm|providencia': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 690000, medianPricePerM2: 10200, sampleSize: 14 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 710000, medianPricePerM2: 10420, sampleSize: 16 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 735000, medianPricePerM2: 10850, sampleSize: 17 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 750000, medianPricePerM2: 11010, sampleSize: 19 },
    ],
};

const valuationFeedState: {
    records: ValuationFeedRecord[];
    historyBySegment: Record<string, ValuationHistoricalPoint[]>;
    sources: ValuationFeedSourceStatus[];
} = {
    records: [...valuationFeedRecords],
    historyBySegment: { ...valuationHistoryBySegment },
    sources: [],
};

function parseFeedRecord(sourceId: string, raw: unknown): ValuationFeedRecord | null {
    const item = asObject(raw);
    const operationType = asString(item.operationType).toLowerCase() === 'rent' ? 'rent' : asString(item.operationType).toLowerCase() === 'sale' ? 'sale' : null;
    const propertyType = normalizePropertyType(item.propertyType ?? item.type ?? item.category ?? '');
    const regionId = asString(item.regionId);
    const communeId = asString(item.communeId);
    const price = typeof item.price === 'number' ? item.price : parseNumberFromString(item.price);
    const areaM2 = typeof item.areaM2 === 'number' ? item.areaM2 : parseNumberFromString(item.areaM2 ?? item.surface ?? item.totalArea);
    const publishedAt = typeof item.publishedAt === 'number'
        ? item.publishedAt
        : (typeof item.updatedAt === 'number' ? item.updatedAt : Date.now());

    if (!operationType || !propertyType || !regionId || !communeId || price == null || areaM2 == null) {
        return null;
    }

    return {
        id: asString(item.id) || `${sourceId}-${feedIdHash(JSON.stringify(item))}`,
        source: asString(item.source) || sourceId,
        operationType,
        propertyType,
        regionId,
        communeId,
        neighborhood: asString(item.neighborhood) || null,
        title: asString(item.title) || `${propertyType} ${operationType}`,
        price,
        currency: asString(item.currency) || (operationType === 'sale' ? 'UF' : 'CLP'),
        areaM2,
        bedrooms: typeof item.bedrooms === 'number' ? item.bedrooms : parseNumberFromString(item.bedrooms),
        bathrooms: typeof item.bathrooms === 'number' ? item.bathrooms : parseNumberFromString(item.bathrooms),
        publishedAt,
        addressLabel: asString(item.addressLabel) || null,
        url: asString(item.url) || null,
    };
}

async function loadPartnerFeed(sourceId: string, envUrlKey: string | undefined, fallbackRecords: ValuationFeedRecord[]): Promise<ValuationFeedConnectorLoadResult<ValuationFeedRecord>> {
    const sourceUrl = envUrlKey ? asString(process.env[envUrlKey]) || null : null;
    if (!sourceUrl) {
        return { records: fallbackRecords, sourceUrl: null };
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Feed ${sourceId} respondiÃ³ ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(payload)
        ? payload as unknown[]
        : Array.isArray(asObject(payload).items)
            ? asObject(payload).items as unknown[]
            : Array.isArray(asObject(payload).records)
                ? asObject(payload).records as unknown[]
                : [];

    const records = rawItems
        .map((item) => parseFeedRecord(sourceId, item))
        .filter((item): item is ValuationFeedRecord => Boolean(item));

    return {
        records: records.length > 0 ? records : fallbackRecords,
        sourceUrl,
    };
}

const valuationFeedConnectors: ValuationFeedConnector[] = [
    {
        id: 'portalinmobiliario_partner',
        label: 'Portal Inmobiliario',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VALUATION_FEED_PORTALINMOBILIARIO_URL',
        load: () => loadPartnerFeed(
            'portalinmobiliario_partner',
            'VALUATION_FEED_PORTALINMOBILIARIO_URL',
            valuationFeedRecords.filter((item) => item.source === 'portalinmobiliario_feed')
        ),
    },
    {
        id: 'toctoc_partner',
        label: 'TOCTOC',
        license: 'partner_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VALUATION_FEED_TOCTOC_URL',
        load: () => loadPartnerFeed(
            'toctoc_partner',
            'VALUATION_FEED_TOCTOC_URL',
            valuationFeedRecords.filter((item) => item.source === 'toctoc_feed')
        ),
    },
    {
        id: 'mercadolibre_partner',
        label: 'Mercado Libre Inmuebles',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VALUATION_FEED_MERCADOLIBRE_URL',
        load: () => loadPartnerFeed(
            'mercadolibre_partner',
            'VALUATION_FEED_MERCADOLIBRE_URL',
            valuationFeedRecords.filter((item) => item.source === 'mercadolibre_feed')
        ),
    },
];

function primeValuationFeedState() {
    if (valuationFeedState.sources.length > 0) return;
    valuationFeedState.sources = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: countInternalPropiedadesListings(),
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
        ...valuationFeedConnectors.map((connector) => ({
            id: connector.id,
            label: connector.label,
            license: connector.license,
            transport: connector.transport,
            status: connector.transport === 'snapshot' ? 'ready' as ValuationFeedHealth : 'degraded' as ValuationFeedHealth,
            sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
            itemCount: valuationFeedRecords.filter((item) => item.source.includes(connector.id.split('_')[0]) || item.source.includes(connector.label.toLowerCase().split(' ')[0])).length,
            lastSyncAt: null,
            lastError: connector.transport === 'snapshot' ? null : 'Usando snapshot local hasta conectar feed licenciado.',
            supportsHistory: connector.supportsHistory,
        })),
    ];
}

export async function refreshValuationFeeds() {
    const nextHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = { ...valuationHistoryBySegment };
    const nextRecords: ValuationFeedRecord[] = [];
    const nextSources: ValuationFeedSourceStatus[] = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: countInternalPropiedadesListings(),
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
    ];

    for (const connector of valuationFeedConnectors) {
        try {
            const result = await connector.load();
            nextRecords.push(...result.records);
            if (result.historyBySegment) {
                Object.assign(nextHistoryBySegment, result.historyBySegment);
            }
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: result.sourceUrl ? 'ready' : 'degraded',
                sourceUrl: result.sourceUrl,
                itemCount: result.records.length,
                lastSyncAt: Date.now(),
                lastError: result.sourceUrl ? null : 'Usando snapshot local hasta configurar un feed externo.',
                supportsHistory: connector.supportsHistory,
            });
        } catch (error) {
            const fallbackRecords = connector.id === 'portalinmobiliario_partner'
                ? valuationFeedRecords.filter((item) => item.source === 'portalinmobiliario_feed')
                : connector.id === 'toctoc_partner'
                    ? valuationFeedRecords.filter((item) => item.source === 'toctoc_feed')
                    : valuationFeedRecords.filter((item) => item.source === 'mercadolibre_feed');
            nextRecords.push(...fallbackRecords);
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: 'degraded',
                sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
                itemCount: fallbackRecords.length,
                lastSyncAt: Date.now(),
                lastError: error instanceof Error ? error.message : 'No pudimos refrescar esta fuente.',
                supportsHistory: connector.supportsHistory,
            });
        }
    }

    valuationFeedState.records = nextRecords;
    valuationFeedState.historyBySegment = nextHistoryBySegment;
    valuationFeedState.sources = nextSources;
    return valuationFeedState;
}

export function getValuationFeedState() {
    primeValuationFeedState();
    return valuationFeedState;
}

export function getValuationFeedRecords(): ValuationFeedRecord[] {
    return valuationFeedState.records;
}
