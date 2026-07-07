import { randomUUID } from 'node:crypto';
import { asObject, asString } from '../shared/index.js';
import type { VerticalType } from '@simple/types';

export type PortalKey = 'yapo' | 'chileautos' | 'mercadolibre' | 'facebook';
export type PortalSyncStatus = 'missing' | 'ready' | 'published' | 'failed';

export type ListingPortalSyncRecord = {
    portal: PortalKey;
    status: PortalSyncStatus;
    publishedAt: number | null;
    externalId: string | null;
    externalUrl: string | null;
    lastError: string | null;
    lastAttemptAt: number | null;
};

export type ListingLeadSource =
    | 'internal_form'
    | 'direct_message'
    | 'whatsapp'
    | 'phone_call'
    | 'email'
    | 'instagram'
    | 'facebook'
    | 'mercadolibre'
    | 'yapo'
    | 'chileautos'
    | 'portal';

export type ListingLeadChannel = 'lead' | 'message' | 'social' | 'portal';

export const LISTING_INTEGRATIONS_STORAGE_KEY = '__simpleIntegrations';

export const PORTAL_LABELS: Record<PortalKey, string> = {
    yapo: 'Yapo',
    chileautos: 'Chileautos',
    mercadolibre: 'MercadoLibre',
    facebook: 'Facebook Marketplace',
};

export const REQUIRED_SPECIFIC_FIELDS_BY_VEHICLE: Record<string, string[]> = {
    motorcycle: ['moto_type', 'engine_cc'],
    truck: ['truck_type', 'axle_config', 'load_capacity_kg'],
    bus: ['bus_type', 'seat_capacity'],
    machinery: ['machine_type', 'operating_hours'],
    nautical: ['vessel_type', 'length_ft'],
    aerial: ['aircraft_type', 'flight_hours', 'registration_code'],
};

export const AUTOS_PORTAL_REQUIREMENTS: Record<PortalKey, { required: string[]; recommended: string[] }> = {
    yapo: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos'],
        recommended: ['mileage', 'fuel', 'bodyType', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    chileautos: {
        required: ['title', 'description', 'brand', 'model', 'year', 'mileage', 'fuel', 'transmission', 'bodyType', 'location', 'price', 'photos', 'specificRequired'],
        recommended: ['specificRequired', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    mercadolibre: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos', 'specificRequired'],
        recommended: ['mileage', 'fuel', 'transmission', 'bodyType', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    facebook: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos'],
        recommended: ['mileage', 'fuel', 'transmission', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
};

export const PROPERTIES_PORTAL_REQUIREMENTS: Record<PortalKey, { required: string[]; recommended: string[] }> = {
    yapo: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    chileautos: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    mercadolibre: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    facebook: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
};

export function getAvailablePortals(vertical: VerticalType): PortalKey[] {
    return vertical === 'autos'
        ? ['yapo', 'chileautos', 'mercadolibre', 'facebook']
        : ['yapo', 'mercadolibre', 'facebook'];
}

export function isPortalAvailableForVertical(vertical: VerticalType, portal: PortalKey): boolean {
    return getAvailablePortals(vertical).includes(portal);
}

export function getPortalLabel(vertical: VerticalType, portal: PortalKey): string {
    if (vertical === 'propiedades' && portal === 'mercadolibre') return 'Portal Inmobiliario';
    if (portal === 'yapo') return 'Yapo';
    if (portal === 'chileautos') return 'Chileautos';
    if (portal === 'mercadolibre') return 'MercadoLibre';
    return 'Facebook Marketplace';
}

const LISTING_LEAD_SOURCE_LABELS: Record<ListingLeadSource, string> = {
    internal_form: 'Formulario',
    direct_message: 'Mensaje',
    whatsapp: 'WhatsApp',
    phone_call: 'Llamada',
    email: 'Correo',
    instagram: 'Instagram',
    facebook: 'Facebook',
    mercadolibre: 'MercadoLibre',
    yapo: 'Yapo',
    chileautos: 'Chileautos',
    portal: 'Portal',
};

function listingLeadSourceLabel(source: ListingLeadSource, _vertical?: VerticalType): string {
    return LISTING_LEAD_SOURCE_LABELS[source] ?? source;
}

export function inferPortalFromLeadImportSource(
    source: ListingLeadSource,
    explicitPortal?: PortalKey | null,
): PortalKey | null {
    if (explicitPortal) return explicitPortal;
    if (source === 'yapo') return 'yapo';
    if (source === 'chileautos') return 'chileautos';
    if (source === 'mercadolibre') return 'mercadolibre';
    if (source === 'facebook') return 'facebook';
    return null;
}

export function inferListingLeadChannel(
    source: ListingLeadSource,
    explicitChannel?: ListingLeadChannel,
): ListingLeadChannel {
    if (explicitChannel) return explicitChannel;
    if (source === 'direct_message') return 'message';
    if (source === 'instagram' || source === 'facebook') return 'social';
    if (source === 'mercadolibre' || source === 'yapo' || source === 'portal' || source === 'chileautos') return 'portal';
    return 'lead';
}

export function getImportedLeadSourceLabel(
    vertical: VerticalType,
    source: ListingLeadSource,
    portal: PortalKey | null,
): string {
    if (source === 'portal' && portal) return getPortalLabel(vertical, portal);
    if (source === 'mercadolibre') return getPortalLabel(vertical, 'mercadolibre');
    return listingLeadSourceLabel(source, vertical);
}

export function parseImportedLeadTimestamp(value: string | number | null | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now();
}

export function sanitizeSyntheticLeadEmailToken(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'externo';
}

export function normalizeImportedLeadName(
    source: ListingLeadSource,
    value: string | null | undefined,
    fallbackEmail: string | null,
    fallbackPhone: string | null,
    fallbackWhatsapp: string | null,
): string {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
    if (fallbackPhone?.trim()) return `Lead ${fallbackPhone.trim()}`;
    if (fallbackWhatsapp?.trim()) return `Lead ${fallbackWhatsapp.trim()}`;
    if (fallbackEmail?.trim()) return fallbackEmail.trim().split('@')[0] || 'Lead externo';
    return `Lead ${listingLeadSourceLabel(source)}`;
}

export function normalizeImportedLeadEmail(input: {
    source: ListingLeadSource;
    externalSourceId?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
}): string {
    const email = input.contactEmail?.trim().toLowerCase();
    if (email) return email;

    const token = [
        input.source,
        input.externalSourceId,
        input.contactPhone,
        input.contactWhatsapp,
        Date.now(),
    ].find((value) => Boolean(asString(value))) ?? randomUUID();

    return `${sanitizeSyntheticLeadEmailToken(String(token))}@lead.simpleplataforma.invalid`;
}

export function normalizeListingPortalSyncRecord(
    portal: PortalKey,
    value: unknown,
): ListingPortalSyncRecord | null {
    const source = asObject(value);
    const status = source.status;
    if (status !== 'missing' && status !== 'ready' && status !== 'published' && status !== 'failed') {
        return null;
    }

    const toTimestamp = (input: unknown): number | null => {
        if (typeof input === 'number' && Number.isFinite(input)) return input;
        if (typeof input === 'string' && input.trim()) {
            const parsed = Number(input);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    };

    const externalUrl = typeof source.externalUrl === 'string' ? source.externalUrl.trim() : '';
    return {
        portal,
        status,
        publishedAt: toTimestamp(source.publishedAt),
        externalId: typeof source.externalId === 'string' ? source.externalId : null,
        externalUrl: externalUrl || null,
        lastError: typeof source.lastError === 'string' ? source.lastError : null,
        lastAttemptAt: toTimestamp(source.lastAttemptAt),
    };
}

export function extractStoredListingIntegrations(
    rawData: unknown,
): Partial<Record<PortalKey, ListingPortalSyncRecord>> {
    const source = asObject(asObject(rawData)[LISTING_INTEGRATIONS_STORAGE_KEY]);
    const integrations: Partial<Record<PortalKey, ListingPortalSyncRecord>> = {};

    for (const portal of ['yapo', 'chileautos', 'mercadolibre', 'facebook'] as const) {
        const normalized = normalizeListingPortalSyncRecord(portal, source[portal]);
        if (normalized) {
            integrations[portal] = normalized;
        }
    }

    return integrations;
}

export function stripStoredListingMetadata(rawData: unknown): unknown {
    const source = asObject(rawData);
    if (!(LISTING_INTEGRATIONS_STORAGE_KEY in source)) return rawData ?? {};
    const clone = { ...source };
    delete clone[LISTING_INTEGRATIONS_STORAGE_KEY];
    return clone;
}

export function embedStoredListingMetadata(
    rawData: unknown,
    integrations: Partial<Record<PortalKey, ListingPortalSyncRecord>>,
): unknown {
    const base = { ...asObject(rawData) };
    delete base[LISTING_INTEGRATIONS_STORAGE_KEY];
    if (Object.keys(integrations).length === 0) return base;
    return {
        ...base,
        [LISTING_INTEGRATIONS_STORAGE_KEY]: integrations,
    };
}
