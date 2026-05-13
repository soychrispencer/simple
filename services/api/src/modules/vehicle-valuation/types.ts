// Vehicle valuation types and interfaces
export type VehicleValuationFeedRecord = {
    id: string;
    source: string;
    operationType: 'sale' | 'rent';
    vehicleType: string;
    regionId: string;
    communeId: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
    price: number;
    currency: string;
    publishedAt: number;
    addressLabel: string | null;
    url: string | null;
};

export type VehicleValuationHistoricalPoint = {
    date: number;
    price: number;
    currency: string;
    source: string;
};

export type VehicleValuationSourceBreakdown = {
    source: string;
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
};

export type VehicleValuationConfidenceBreakdown = {
    confidence: 'high' | 'medium' | 'low';
    count: number;
    avgPrice: number;
};

export type VehicleValuationFeedLicense = 'internal' | 'partner_feed' | 'commercial_feed';

export type VehicleValuationFeedTransport = 'snapshot' | 'remote_json' | 'remote_csv';

export type VehicleValuationFeedHealth = 'ready' | 'syncing' | 'degraded' | 'error';

export type VehicleValuationFeedSourceStatus = {
    id: string;
    label: string;
    license: VehicleValuationFeedLicense;
    transport: VehicleValuationFeedTransport;
    status: VehicleValuationFeedHealth;
    sourceUrl: string | null;
    itemCount: number;
    lastSyncAt: number | null;
    lastError: string | null;
    supportsHistory: boolean;
};

export type VehicleValuationFeedConnectorLoadResult<T> = {
    records: T[];
    sourceUrl: string | null;
};

export type VehicleValuationFeedConnector = {
    id: string;
    label: string;
    license: VehicleValuationFeedLicense;
    transport: VehicleValuationFeedTransport;
    supportsHistory: boolean;
    envUrlKey: string | undefined;
    load: () => Promise<VehicleValuationFeedConnectorLoadResult<VehicleValuationFeedRecord>>;
};

export type VehicleValuationComparable = {
    id: string;
    title: string;
    price: number;
    currency: string;
    mileage: number | null;
    year: number | null;
    distance: number;
    publishedAt: number;
    url: string | null;
};