import { asString, asObject } from '../shared/index.js';

// Types and interfaces
export type ValuationFeedRecord = {
    id: string;
    source: string;
    operationType: 'sale' | 'rent';
    propertyType: string;
    regionId: string;
    communeId: string;
    neighborhood: string | null;
    title: string;
    price: number;
    currency: string;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    publishedAt: number;
    addressLabel: string | null;
    url: string | null;
};

export type ValuationHistoricalPoint = {
    date: number;
    price: number;
    currency: string;
    source: string;
};

export type ValuationSourceBreakdown = {
    source: string;
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
};

export type ValuationConfidenceBreakdown = {
    confidence: 'high' | 'medium' | 'low';
    count: number;
    avgPrice: number;
};

export type ValuationFeedLicense = 'internal' | 'partner_feed' | 'commercial_feed';

export type ValuationFeedTransport = 'snapshot' | 'remote_json' | 'remote_csv';

export type ValuationFeedHealth = 'ready' | 'syncing' | 'degraded' | 'error';

export type ValuationFeedSourceStatus = {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    status: ValuationFeedHealth;
    sourceUrl: string | null;
    itemCount: number;
    lastSyncAt: number | null;
    lastError: string | null;
    supportsHistory: boolean;
};

export type ValuationFeedConnectorLoadResult<T> = {
    records: T[];
    sourceUrl: string | null;
};

export type ValuationFeedConnector = {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    supportsHistory: boolean;
    envUrlKey: string | undefined;
    load: () => Promise<ValuationFeedConnectorLoadResult<ValuationFeedRecord>>;
};

export type ValuationComparable = {
    id: string;
    title: string;
    price: number;
    currency: string;
    areaM2: number;
    distance: number;
    publishedAt: number;
    url: string | null;
};

// State
let valuationFeedState = {
    sources: [] as ValuationFeedSourceStatus[],
};

let valuationFeedRecords: ValuationFeedRecord[] = [];
let valuationHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = {};

// Utility functions
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

function parseNumberFromString(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}

function normalizePropertyType(raw: string): string {
    const normalized = raw.toLowerCase().trim();
    if (normalized.includes('departamento') || normalized.includes('depto')) return 'departamento';
    if (normalized.includes('casa')) return 'casa';
    if (normalized.includes('oficina')) return 'oficina';
    if (normalized.includes('local')) return 'local';
    if (normalized.includes('bodega')) return 'bodega';
    if (normalized.includes('estacionamiento')) return 'estacionamiento';
    return 'otro';
}

export function parseFeedRecord(sourceId: string, raw: unknown): ValuationFeedRecord | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, any>; // Use any to avoid type issues
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
        id: asString(item.id) || `${sourceId}-${hashString(JSON.stringify(item))}`,
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
        throw new Error(`Feed ${sourceId} respondió ${response.status}`);
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

export function primeValuationFeedState() {
    if (valuationFeedState.sources.length > 0) return;
    valuationFeedState.sources = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: 0, // Will be set by caller
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

export function getValuationFeedState() {
    return valuationFeedState;
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
            itemCount: 0, // Will be set by caller
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
    ];

    // Implementation continues...
    return {
        records: nextRecords,
        sources: nextSources,
        history: nextHistoryBySegment,
    };
}

export function getValuationFeedRecords(): ValuationFeedRecord[] {
    return valuationFeedRecords;
}

export function setValuationFeedRecords(records: ValuationFeedRecord[]) {
    valuationFeedRecords = records;
}

export * from './router.js';