import { asString, asObject } from '../shared/index.js';
import type {
    VehicleValuationFeedRecord,
    VehicleValuationFeedConnector,
    VehicleValuationFeedConnectorLoadResult,
    VehicleValuationFeedHealth
} from './types.js';

// Local type definitions for shared types
type ValuationFeedHealth = 'ready' | 'syncing' | 'degraded' | 'error' | 'disabled';
type ValuationFeedSourceStatus = {
    id: string;
    label: string;
    license: string;
    transport: string;
    status: ValuationFeedHealth;
    sourceUrl: string | null;
    itemCount: number;
    lastSyncAt: number | null;
    lastError: string | null;
    supportsHistory: boolean;
};
type ValuationHistoricalPoint = {
    date: number;
    price: number;
    currency: string;
    source: string;
};

// State
let vehicleValuationFeedState = {
    records: [] as VehicleValuationFeedRecord[],
    historyBySegment: {} as Record<string, ValuationHistoricalPoint[]>,
    sources: [] as ValuationFeedSourceStatus[],
};

let vehicleValuationFeedRecords: VehicleValuationFeedRecord[] = [];
let vehicleValuationHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = {};

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

export function normalizeVehicleType(raw: unknown): string {
    const value = asString(raw).toLowerCase();
    if (value.includes('moto')) return 'motorcycle';
    if (value.includes('camion')) return 'truck';
    if (value.includes('bus')) return 'bus';
    if (value.includes('maquinaria')) return 'machinery';
    if (value.includes('naut')) return 'nautical';
    if (value.includes('aer')) return 'aerial';
    return value || 'car';
}

export function normalizeVehicleSlug(raw: unknown): string {
    return asString(raw)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function parseVehicleFeedRecord(sourceId: string, raw: unknown): VehicleValuationFeedRecord | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = raw as Record<string, any>;

    const operationType = asString(item.operationType).toLowerCase() === 'rent' ? 'rent' : asString(item.operationType).toLowerCase() === 'sale' ? 'sale' : null;
    const brand = normalizeVehicleSlug(item.brand ?? item.make);
    const model = normalizeVehicleSlug(item.model);
    const vehicleType = normalizeVehicleType(item.vehicleType ?? item.category ?? item.type);
    const regionId = asString(item.regionId);
    const communeId = asString(item.communeId);
    const price = typeof item.price === 'number' ? item.price : parseNumberFromString(item.price);

    if (!operationType || !brand || !model || !vehicleType || !regionId || !communeId || price == null) {
        return null;
    }

    return {
        id: asString(item.id) || `${sourceId}-${hashString(JSON.stringify(item))}`,
        source: asString(item.source) || sourceId,
        operationType,
        vehicleType,
        regionId,
        communeId,
        brand,
        model,
        year: typeof item.year === 'number' ? item.year : parseNumberFromString(item.year),
        mileage: typeof item.mileageKm === 'number' ? item.mileageKm : parseNumberFromString(item.mileageKm ?? item.kilometers ?? item.mileage),
        price,
        currency: asString(item.currency) || 'CLP',
        publishedAt: typeof item.publishedAt === 'number' ? item.publishedAt : Date.now(),
        addressLabel: asString(item.addressLabel) || null,
        url: asString(item.url) || null,
    };
}

async function loadVehiclePartnerFeed(sourceId: string, envUrlKey: string | undefined, fallbackRecords: VehicleValuationFeedRecord[]): Promise<VehicleValuationFeedConnectorLoadResult<VehicleValuationFeedRecord>> {
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
        .map((item) => parseVehicleFeedRecord(sourceId, item))
        .filter((item): item is VehicleValuationFeedRecord => Boolean(item));

    return {
        records: records.length > 0 ? records : fallbackRecords,
        sourceUrl,
    };
}

const vehicleValuationFeedConnectors: VehicleValuationFeedConnector[] = [
    {
        id: 'chileautos_partner',
        label: 'Chileautos',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VEHICLE_VALUATION_FEED_CHILEAUTOS_URL',
        load: () => loadVehiclePartnerFeed(
            'chileautos_partner',
            'VEHICLE_VALUATION_FEED_CHILEAUTOS_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'chileautos_feed')
        ),
    },
    {
        id: 'mercadolibre_vehicles_partner',
        label: 'Mercado Libre Vehículos',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VEHICLE_VALUATION_FEED_MERCADOLIBRE_URL',
        load: () => loadVehiclePartnerFeed(
            'mercadolibre_vehicles_partner',
            'VEHICLE_VALUATION_FEED_MERCADOLIBRE_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'mercadolibre_vehicles_feed')
        ),
    },
    {
        id: 'yapo_partner',
        label: 'Yapo',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VEHICLE_VALUATION_FEED_YAPO_URL',
        load: () => loadVehiclePartnerFeed(
            'yapo_partner',
            'VEHICLE_VALUATION_FEED_YAPO_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'yapo_feed')
        ),
    },
    {
        id: 'kavak_partner',
        label: 'Kavak',
        license: 'partner_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VEHICLE_VALUATION_FEED_KAVAK_URL',
        load: () => loadVehiclePartnerFeed(
            'kavak_partner',
            'VEHICLE_VALUATION_FEED_KAVAK_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'kavak_feed')
        ),
    },
];

export function primeVehicleValuationFeedState() {
    if (vehicleValuationFeedState.sources.length > 0) return;
    vehicleValuationFeedState.sources = [
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
        ...vehicleValuationFeedConnectors.map((connector) => ({
            id: connector.id,
            label: connector.label,
            license: connector.license,
            transport: connector.transport,
            status: connector.transport === 'snapshot' ? 'ready' as VehicleValuationFeedHealth : 'degraded' as VehicleValuationFeedHealth,
            sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
            itemCount: vehicleValuationFeedRecords.filter((item) => item.source.includes(connector.label.toLowerCase().split(' ')[0])).length,
            lastSyncAt: null,
            lastError: connector.transport === 'snapshot' ? null : 'Usando copia local hasta configurar un feed externo.',
            supportsHistory: connector.supportsHistory,
        })),
        {
            id: 'facebook_marketplace',
            label: 'Facebook Marketplace',
            license: 'commercial_feed',
            transport: 'snapshot',
            status: 'disabled',
            sourceUrl: null,
            itemCount: 0,
            lastSyncAt: null,
            lastError: 'Requiere integración autorizada. No usamos scraping como fuente operativa.',
            supportsHistory: false,
        },
    ];
}

export async function refreshVehicleValuationFeeds() {
    const nextHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = { ...vehicleValuationHistoryBySegment };
    const nextRecords: VehicleValuationFeedRecord[] = [];
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

    for (const connector of vehicleValuationFeedConnectors) {
        try {
            const result = await connector.load();
            nextRecords.push(...result.records);
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: result.sourceUrl ? 'ready' : 'degraded',
                sourceUrl: result.sourceUrl,
                itemCount: result.records.length,
                lastSyncAt: Date.now(),
                lastError: result.sourceUrl ? null : 'Usando copia local hasta configurar un feed externo.',
                supportsHistory: connector.supportsHistory,
            });
        } catch (error) {
            const fallbackRecords = connector.id === 'chileautos_partner'
                ? vehicleValuationFeedRecords.filter((item) => item.source === 'chileautos_feed')
                : connector.id === 'mercadolibre_vehicles_partner'
                    ? vehicleValuationFeedRecords.filter((item) => item.source === 'mercadolibre_vehicles_feed')
                    : connector.id === 'yapo_partner'
                        ? vehicleValuationFeedRecords.filter((item) => item.source === 'yapo_feed')
                        : vehicleValuationFeedRecords.filter((item) => item.source === 'kavak_feed');
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

    nextSources.push({
        id: 'facebook_marketplace',
        label: 'Facebook Marketplace',
        license: 'commercial_feed',
        transport: 'snapshot',
        status: 'disabled',
        sourceUrl: null,
        itemCount: 0,
        lastSyncAt: null,
        lastError: 'Requiere integración autorizada. No usamos scraping como fuente operativa.',
        supportsHistory: false,
    });

    vehicleValuationFeedState.records = nextRecords;
    vehicleValuationFeedState.historyBySegment = nextHistoryBySegment;
    vehicleValuationFeedState.sources = nextSources;
    return vehicleValuationFeedState;
}

export function getVehicleValuationFeedState() {
    primeVehicleValuationFeedState();
    return vehicleValuationFeedState;
}

export function getVehicleValuationFeedRecords(): VehicleValuationFeedRecord[] {
    return vehicleValuationFeedRecords;
}

export function setVehicleValuationFeedRecords(records: VehicleValuationFeedRecord[]) {
    vehicleValuationFeedRecords = records;
}

export * from './pricing.js';
export * from './router.js';