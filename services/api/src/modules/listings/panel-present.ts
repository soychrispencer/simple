import { evaluatePublicationLifecycle, getPublicationLifecyclePolicy } from '@simple/config';
import type { VerticalType } from '@simple/types';
import { getPortalCoverage, type PortalCoverageListing } from './portal-coverage.js';
import {
    getAvailablePortals,
    getPortalLabel,
    type PortalKey,
    type PortalSyncStatus,
} from './portals.js';
import { normalizeListingRawDataForResponse } from './media-delivery.js';
import type { ListingRecord } from './persist.js';

export function listingAgeDays(createdAt: number): number {
    if (!createdAt) return 0;
    const delta = Date.now() - createdAt;
    return Math.max(0, Math.floor(delta / (1000 * 60 * 60 * 24)));
}

function portalCoverageInput(record: ListingRecord) {
    return {
        vertical: record.vertical,
        listingType: record.section,
        title: record.title,
        description: record.description,
        price: record.price,
        location: record.location,
        locationData: record.locationData as PortalCoverageListing['locationData'],
        rawData: record.rawData,
    } satisfies PortalCoverageListing;
}

export function getPortalSyncView(record: ListingRecord, portal: PortalKey) {
    const existing = record.integrations[portal];
    const coverage = getPortalCoverage(portalCoverageInput(record), portal);

    let status: PortalSyncStatus = coverage.missingRequired.length === 0 ? 'ready' : 'missing';
    let lastError: string | null = null;

    if (existing?.status === 'published') {
        status = 'published';
    } else if (existing?.status === 'failed') {
        status = 'failed';
        lastError = existing.lastError ?? null;
    }

    return {
        portal,
        label: getPortalLabel(record.vertical as VerticalType, portal),
        status,
        missingRequired: coverage.missingRequired,
        missingRecommended: coverage.missingRecommended,
        publishedAt: existing?.publishedAt ?? null,
        externalId: existing?.externalId ?? null,
        externalUrl: existing?.externalUrl ?? null,
        lastError,
    };
}

export function listingToResponse(record: ListingRecord) {
    const integrations = getAvailablePortals(record.vertical as VerticalType).map((portal) =>
        getPortalSyncView(record, portal),
    );
    const publicationLifecycle = evaluatePublicationLifecycle(
        getPublicationLifecyclePolicy(
            record.vertical === 'autos' ? 'simpleautos' : 'simplepropiedades',
            record.section as 'sale' | 'rent' | 'auction' | 'project',
        ),
        record.status as 'draft' | 'active' | 'paused' | 'sold' | 'archived' | 'closed',
        record.updatedAt,
    );
    return {
        id: record.id,
        accountId: record.accountId,
        vertical: record.vertical,
        section: record.section,
        title: record.title,
        description: record.description,
        price: record.price,
        status: record.status,
        views: record.views,
        favs: record.favs,
        leads: record.leads,
        days: listingAgeDays(record.createdAt),
        href: record.href,
        location: record.location,
        locationData: record.locationData,
        updatedAt: record.updatedAt,
        publicationLifecycle,
        integrations,
        rawData: normalizeListingRawDataForResponse(record.rawData ?? null),
    };
}

export function listingToDetailResponse(record: ListingRecord) {
    return {
        ...listingToResponse(record),
        rawData: normalizeListingRawDataForResponse(record.rawData ?? null),
    };
}
