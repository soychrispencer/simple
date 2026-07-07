import { sql, type SQL } from 'drizzle-orm';
import { listings } from '../../db/schema.js';
import type { PublicListingSearchQuery } from '../public/listing-search.js';

function lowerJsonText(pathSql: SQL): SQL {
    return sql`lower(trim(coalesce(${pathSql}, '')))`;
}

/**
 * Precio numérico para filtros SQL (misma prioridad que memoria / Instagram).
 * Paths: `listings.price_label`, `raw_data.commercial.price`, `raw_data.price`.
 */
function listingPriceNumericSql(): SQL {
    return sql`NULLIF(
        regexp_replace(
            coalesce(
                ${listings.priceLabel},
                ${listings.rawData}->'commercial'->>'price',
                ${listings.rawData}->>'price',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        ),
        ''
    )::numeric`;
}

/**
 * Año numérico para filtros SQL.
 * Paths: `raw_data.basic.year`, `raw_data.year`.
 */
function listingYearNumericSql(): SQL {
    return sql`NULLIF(
        regexp_replace(
            coalesce(
                ${listings.rawData}->'basic'->>'year',
                ${listings.rawData}->>'year',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        ),
        ''
    )::numeric`;
}

function listingAreaNumericSql(): SQL {
    return sql`GREATEST(
        COALESCE(NULLIF(regexp_replace(coalesce(${listings.rawData}->'basic'->>'totalArea', ''), '[^0-9]', '', 'g'), '')::numeric, 0),
        COALESCE(NULLIF(regexp_replace(coalesce(${listings.rawData}->'basic'->>'usableArea', ''), '[^0-9]', '', 'g'), '')::numeric, 0),
        COALESCE(NULLIF(regexp_replace(coalesce(${listings.rawData}->'basic'->>'surface', ''), '[^0-9]', '', 'g'), '')::numeric, 0),
        COALESCE(NULLIF(regexp_replace(coalesce(${listings.rawData}->'project'->>'usableAreaFrom', ''), '[^0-9]', '', 'g'), '')::numeric, 0)
    )`;
}

function listingRoomsNumericSql(): SQL {
    return sql`NULLIF(
        regexp_replace(coalesce(${listings.rawData}->'basic'->>'rooms', ''), '[^0-9]', '', 'g'),
        ''
    )::numeric`;
}

function listingBathroomsNumericSql(): SQL {
    return sql`NULLIF(
        regexp_replace(coalesce(${listings.rawData}->'basic'->>'bathrooms', ''), '[^0-9]', '', 'g'),
        ''
    )::numeric`;
}

function listingParkingNumericSql(): SQL {
    return sql`NULLIF(
        regexp_replace(coalesce(${listings.rawData}->'basic'->>'parkingSpaces', ''), '[^0-9]', '', 'g'),
        ''
    )::numeric`;
}

/** Condiciones PostgreSQL para filtros de marketplace (vehículos y propiedades). */
export function buildPublicListingSearchSqlConditions(query: PublicListingSearchQuery): SQL[] {
    const conditions: SQL[] = [];
    const priceNumeric = listingPriceNumericSql();
    const yearNumeric = listingYearNumericSql();

    if (query.region) {
        const region = query.region.toLowerCase();
        conditions.push(sql`(
            ${lowerJsonText(sql`${listings.locationData}->>'regionId'`)}
            = ${region}
            OR ${lowerJsonText(sql`${listings.rawData}->'location'->>'regionId'`)}
            = ${region}
        )`);
    }

    if (query.commune) {
        const commune = query.commune.toLowerCase();
        conditions.push(sql`(
            ${lowerJsonText(sql`${listings.locationData}->>'communeId'`)}
            = ${commune}
            OR ${lowerJsonText(sql`${listings.rawData}->'location'->>'communeId'`)}
            = ${commune}
        )`);
    }

    if (query.brand) {
        const brand = query.brand.toLowerCase();
        conditions.push(sql`(
            ${lowerJsonText(sql`${listings.rawData}->'basic'->>'brand'`)}
            = ${brand}
            OR ${lowerJsonText(sql`${listings.rawData}->>'brand'`)}
            = ${brand}
        )`);
    }

    if (query.model) {
        const model = query.model.toLowerCase();
        conditions.push(sql`(
            ${lowerJsonText(sql`${listings.rawData}->'basic'->>'model'`)}
            = ${model}
            OR ${lowerJsonText(sql`${listings.rawData}->>'model'`)}
            = ${model}
        )`);
    }

    if (query.fuel) {
        const fuel = query.fuel.toLowerCase();
        conditions.push(sql`(
            ${lowerJsonText(sql`${listings.rawData}->'basic'->>'fuelType'`)}
            = ${fuel}
            OR ${lowerJsonText(sql`${listings.rawData}->>'fuelType'`)}
            = ${fuel}
        )`);
    }

    if (query.priceFrom) {
        const min = Number(query.priceFrom);
        if (Number.isFinite(min)) {
            conditions.push(sql`${priceNumeric} >= ${min}`);
        }
    }

    if (query.priceTo) {
        const max = Number(query.priceTo);
        if (Number.isFinite(max)) {
            conditions.push(sql`${priceNumeric} <= ${max}`);
        }
    }

    if (query.yearFrom) {
        const minYear = Number(query.yearFrom);
        if (Number.isFinite(minYear)) {
            conditions.push(sql`${yearNumeric} >= ${minYear}`);
        }
    }

    if (query.yearTo) {
        const maxYear = Number(query.yearTo);
        if (Number.isFinite(maxYear)) {
            conditions.push(sql`${yearNumeric} <= ${maxYear}`);
        }
    }

    if (query.propertyType) {
        const propertyType = query.propertyType.toLowerCase();
        if (propertyType === 'local') {
            conditions.push(sql`(
                ${lowerJsonText(sql`${listings.rawData}->'setup'->>'propertyType'`)} LIKE '%local%'
                OR ${lowerJsonText(sql`${listings.rawData}->'basic'->>'propertyType'`)} LIKE '%local%'
            )`);
        } else {
            conditions.push(sql`(
                ${lowerJsonText(sql`${listings.rawData}->'setup'->>'propertyType'`)} = ${propertyType}
                OR ${lowerJsonText(sql`${listings.rawData}->'basic'->>'propertyType'`)} = ${propertyType}
                OR ${lowerJsonText(sql`${listings.rawData}->'setup'->>'propertyType'`)} LIKE ${`%${propertyType}%`}
                OR ${lowerJsonText(sql`${listings.rawData}->'basic'->>'propertyType'`)} LIKE ${`%${propertyType}%`}
            )`);
        }
    }

    if (query.bedrooms) {
        const minimum = Number(String(query.bedrooms).replace(/\+$/, ''));
        if (Number.isFinite(minimum)) {
            conditions.push(sql`${listingRoomsNumericSql()} >= ${minimum}`);
        }
    }

    if (query.bathrooms) {
        const minimum = Number(String(query.bathrooms).replace(/\+$/, ''));
        if (Number.isFinite(minimum)) {
            conditions.push(sql`${listingBathroomsNumericSql()} >= ${minimum}`);
        }
    }

    if (query.parking) {
        const minimum = Number(String(query.parking).replace(/\+$/, ''));
        if (Number.isFinite(minimum)) {
            conditions.push(sql`${listingParkingNumericSql()} >= ${minimum}`);
        }
    }

    if (query.minArea) {
        const minimumArea = Number(query.minArea);
        if (Number.isFinite(minimumArea)) {
            conditions.push(sql`${listingAreaNumericSql()} >= ${minimumArea}`);
        }
    }

    if (query.salesStage) {
        const stage = `%${query.salesStage.toLowerCase()}%`;
        conditions.push(sql`${lowerJsonText(sql`${listings.rawData}->'project'->>'salesStage'`)} LIKE ${stage}`);
    }

    if (query.deliveryStatus) {
        const delivery = `%${query.deliveryStatus.toLowerCase()}%`;
        conditions.push(sql`${lowerJsonText(sql`${listings.rawData}->'project'->>'deliveryStatus'`)} LIKE ${delivery}`);
    }

    if (query.q) {
        const term = `%${query.q.toLowerCase()}%`;
        conditions.push(sql`(
            lower(${listings.title}) LIKE ${term}
            OR lower(coalesce(${listings.description}, '')) LIKE ${term}
            OR ${lowerJsonText(sql`${listings.rawData}->'basic'->>'brand'`)} LIKE ${term}
            OR ${lowerJsonText(sql`${listings.rawData}->>'brand'`)} LIKE ${term}
            OR ${lowerJsonText(sql`${listings.rawData}->'basic'->>'model'`)} LIKE ${term}
            OR ${lowerJsonText(sql`${listings.rawData}->>'model'`)} LIKE ${term}
        )`);
    }

    return conditions;
}
