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

/** Condiciones PostgreSQL para filtros de marketplace (marca/modelo/región/comuna/combustible/precio/año). */
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
