import { createElement, type ReactNode } from 'react';
import {
    IconBath,
    IconBed,
    IconBox,
    IconBuilding,
    IconCar,
    IconGasStation,
    IconGauge,
    IconManualGearbox,
    IconParking,
    IconRuler,
} from '@tabler/icons-react';
import type { ListingAccent } from '../types';
import type { MarketplaceReelSpec } from '../marketplace-reel-listing-card';

function specIcon(accent: ListingAccent, index: number): ReactNode {
    const autosCycle = [IconCar, IconGauge, IconGasStation, IconManualGearbox];
    // Placeholders neutros (no forzar dorm/baño en terreno/parcela).
    const propCycle = [IconBuilding, IconRuler, IconParking, IconBox];
    const cycle = accent === 'propiedades' ? propCycle : autosCycle;
    const Icon = cycle[index] ?? cycle[0];
    return createElement(Icon, { size: 18 });
}

/** Ícono de spec de propiedades según el contenido del label. */
export function propertySpecIconForLabel(label: string): ReactNode {
    const lower = label.toLowerCase();
    if (/^\d+\s*d\b/.test(lower) || /dorm|hab/.test(lower)) return createElement(IconBed, { size: 18 });
    if (/^\d+\s*b\b/.test(lower) || /baño|bano/.test(lower)) return createElement(IconBath, { size: 18 });
    if (/est\.?|estacionamiento|\d+\s*e\b/.test(lower)) return createElement(IconParking, { size: 18 });
    if (/bod|bodega|\d+\s*bo\b/.test(lower)) return createElement(IconBox, { size: 18 });
    if (/m²|m2|metros|superficie|út\.|utiles|útiles/.test(lower)) return createElement(IconRuler, { size: 18 });
    if (/unidad/.test(lower)) return createElement(IconBuilding, { size: 18 });
    return createElement(IconBuilding, { size: 18 });
}

/** Ubicación corta para cards: solo la comuna. */
export function shortenListingLocation(location: string): string {
    const trimmed = location.replace(/\s+/g, ' ').trim();
    if (!trimmed) return trimmed;

    const parts = trimmed
        .split(/\s*(?:,|·|\||\/)\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) return trimmed;

    const isRegionLike = (value: string) =>
        /^(regi[oó]n|rm|chile|metropolitana)\b/i.test(value)
        || /\bregi[oó]n\b/i.test(value)
        || /\bmetropolitana\b/i.test(value);

    const isAddressLike = (value: string) =>
        /\d/.test(value)
        || /^(av\.?|avenida|calle|pasaje|psje\.?|camino|ruta)\b/i.test(value);

    const withoutRegion = parts.filter((part) => !isRegionLike(part));
    const communeCandidates = withoutRegion.filter((part) => !isAddressLike(part));
    // Preferir la última parte tipo comuna (p. ej. "Sector X, Providencia, Región…").
    const commune = (communeCandidates.length > 0
        ? communeCandidates[communeCandidates.length - 1]
        : withoutRegion[withoutRegion.length - 1])
        ?? parts[0];

    if (commune.length > 28) return `${commune.slice(0, 27)}…`;
    return commune;
}

/** Compacta labels de specs para cards, priorizando legibilidad. */
export function abbreviateListingSpecLabel(label: string): string {
    const trimmed = label
        .normalize('NFKC')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!trimmed) return trimmed;

    const dorm = trimmed.match(/^(\d+)\s*(dormitorios?|dorm\.?|habitaciones?|hab\.?|d)$/i);
    if (dorm) return Number(dorm[1]) === 1 ? '1 dorm' : `${dorm[1]} dorm`;

    const bath = trimmed.match(/^(\d+)\s*(baños?|banos?|b)$/i);
    if (bath) return Number(bath[1]) === 1 ? '1 baño' : `${bath[1]} baños`;

    const parking = trimmed.match(/^(\d+)\s*(est\.?|estacionamientos?|e)$/i);
    if (parking) return Number(parking[1]) === 1 ? '1 est.' : `${parking[1]} est.`;

    const storage = trimmed.match(/^(\d+)\s*(bod\.?|bodegas?|bo)$/i);
    if (storage) return Number(storage[1]) === 1 ? '1 bod.' : `${storage[1]} bod.`;

    const surface = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(m²|m2|mt2|mts?²?)(?:\s*út\.?)?$/i);
    if (surface) return `${surface[1].replace(',', '.')} m²`;

    const hours = trimmed.match(/^([\d.\s,]+)\s*(h|hrs?|horas?)$/i);
    if (hours) {
        const digits = hours[1].replace(/[^\d]/g, '');
        const num = Number(digits);
        if (!Number.isNaN(num) && num > 0) return `${num} h`;
        return 'h';
    }

    const km = trimmed.match(/^([\d.\s,]+)\s*(km|kil[oó]metros?)$/i);
    if (km) {
        const digits = km[1].replace(/[^\d]/g, '');
        const num = Number(digits);
        if (!Number.isNaN(num) && num >= 1000) {
            return `${Math.round(num / 1000)} mil km`;
        }
        if (!Number.isNaN(num) && num > 0) return `${num} km`;
        return 'km';
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'automático' || lower === 'automatico' || lower === 'automática' || lower === 'automatica') {
        return 'Automát.';
    }
    if (lower === 'manual') return 'Manual';
    if (lower === 'secuencial') return 'Secuenc.';
    if (lower === 'cvt') return 'CVT';
    if (lower === 'dct / dsg' || lower === 'dct' || lower === 'dsg') return 'DCT';
    if (lower === 'tiptronic') return 'Tiptronic';
    if (lower === 'seminuevo' || lower === 'semi-nuevo' || lower === 'semi nuevo') return 'Seminuevo';
    if (lower === 'nuevo') return 'Nuevo';
    if (lower === 'usado') return 'Usado';
    if (lower === 'siniestrado') return 'Siniestrado';
    if (lower === 'para desarme' || lower === 'desarme') return 'Desarme';
    if (lower === 'colección' || lower === 'coleccion') return 'Colección';
    if (lower === 'departamento') return 'Depto';
    if (lower === 'estacionamiento' || lower === 'estacionamientos') return 'Estac.';
    if (lower === 'bodega' || lower === 'bodegas') return 'Bodega';
    if (lower === 'bencina' || lower === 'gasolina') return 'Bencina';
    if (lower === 'diésel' || lower === 'diesel') return 'Diésel';
    if (lower === 'híbrido' || lower === 'hibrido') return 'Híbrido';
    if (lower === 'eléctrico' || lower === 'electrico') return 'Eléct.';
    if (lower === 'sedán' || lower === 'sedan') return 'Sedán';
    if (lower === 'camioneta' || lower === 'pickup') return 'Camioneta';
    if (lower === 'hatchback') return 'Hatchback';
    if (lower === 'suv') return 'SUV';

    if (trimmed.length > 11) return `${trimmed.slice(0, 10)}…`;
    return trimmed;
}

export function isResidentialPropertyType(propertyType?: string | null): boolean {
    const value = (propertyType ?? '').toLowerCase();
    return /casa|depto|departamento|townhouse|loft|penthouse|duplex|dúplex|studio|estudio|local comercial|^local$/.test(value);
}

function isLandPropertyType(propertyType?: string | null): boolean {
    const value = (propertyType ?? '').toLowerCase();
    return value === 'terreno' || value === 'parcela' || /\bterreno\b|\bparcela\b/.test(value);
}

function isOfficePropertyType(propertyType?: string | null): boolean {
    return (propertyType ?? '').toLowerCase().includes('oficina');
}

function isWarehousePropertyType(propertyType?: string | null): boolean {
    const value = (propertyType ?? '').toLowerCase();
    return value === 'bodega' || /^bodega\b/.test(value);
}

function pickTag(tags: string[], patterns: RegExp[]): string | null {
    const index = tags.findIndex((tag) => patterns.some((pattern) => pattern.test(tag)));
    if (index < 0) return null;
    const [value] = tags.splice(index, 1);
    return value;
}

/**
 * Ordena tags de propiedades para cards según tipo.
 */
export function orderPropertyCardTags(tags: string[], propertyType?: string | null): string[] {
    const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
    if (normalized.length === 0) return [];

    const looksProgram = isResidentialPropertyType(propertyType)
        || normalized.some((tag) => /^\d+\s*D$/i.test(tag) || /dorm|hab/i.test(tag));

    if (looksProgram) {
        const ordered = [
            pickTag(normalized, [/^\d+\s*D$/i, /dorm|hab/i]),
            pickTag(normalized, [/^\d+\s*B$/i, /baño|bano/i]),
            pickTag(normalized, [/^\d+\s*E$/i, /est\.?|estacionamiento/i]),
            pickTag(normalized, [/^\d+\s*Bo$/i, /bod|bodega/i]),
        ].filter(Boolean) as string[];
        return ordered.slice(0, 4);
    }

    if (isLandPropertyType(propertyType) || normalized.some((tag) => /terreno|parcela/i.test(tag))) {
        const ordered = [
            pickTag(normalized, [/terreno|parcela/i]),
            pickTag(normalized, [/m²|m2|metros|superficie/i]),
            pickTag(normalized, [/retail|oficina|restaurant|industria|salud|educaci|servicios|uso/i]),
            pickTag(normalized, [/nuevo|usado|remodelado|refaccionar|entrega|verde|condici/i]),
        ].filter(Boolean) as string[];
        return [...ordered, ...normalized].slice(0, 4);
    }

    if (isOfficePropertyType(propertyType)) {
        const ordered = [
            pickTag(normalized, [/oficina/i]),
            pickTag(normalized, [/m²|m2|metros|superficie/i]),
            pickTag(normalized, [/^\d+\s*E$/i, /est\.?|estacionamiento/i]),
            pickTag(normalized, [/^\d+\s*Bo$/i, /bod|bodega/i]),
        ].filter(Boolean) as string[];
        return [...ordered, ...normalized].slice(0, 4);
    }

    if (isWarehousePropertyType(propertyType)) {
        const ordered = [
            pickTag(normalized, [/bodega/i]),
            pickTag(normalized, [/m²|m2|metros|superficie|út/i]),
            pickTag(normalized, [/^\d+\s*E$/i, /est\.?|estacionamiento/i]),
        ].filter(Boolean) as string[];
        return [...ordered, ...normalized].slice(0, 4);
    }

    const ordered = [
        pickTag(normalized, [/casa|departamento|depto|oficina|terreno|local|bodega|parcela|estacionamiento|proyecto/i]),
        pickTag(normalized, [/m²|m2|metros|superficie|unidad/i]),
        pickTag(normalized, [/^\d+\s*E$/i, /est\.?|estacionamiento/i]),
        pickTag(normalized, [/^\d+\s*Bo$/i, /bod|bodega/i]),
    ].filter(Boolean) as string[];

    return [...ordered, ...normalized].slice(0, 4);
}

/**
 * Ordena tags de vehículos para cards.
 * Tipo/categoría → km/h → combustible → transmisión (sin año: ya va en el título).
 */
export function orderVehicleCardTags(tags: string[]): string[] {
    const normalized = tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => !/^(19|20)\d{2}$/.test(tag));

    if (normalized.length === 0) return [];

    const ordered = [
        pickTag(normalized, [/auto|sedán|sedan|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible|cami[oó]n|maquinaria|n[aá]utico|a[eé]reo/i]),
        pickTag(normalized, [/km|kilometraje|kil[oó]metro|\d+\s*h\b|horas?/i]),
        pickTag(normalized, [/bencina|gasolina|diesel|diésel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i]),
        pickTag(normalized, [/automático|automatico|manual|cvt|secuencial|tiptronic|dct|dsg/i]),
    ].filter(Boolean) as string[];

    return [...ordered, ...normalized].slice(0, 4);
}

/** Ícono de spec de vehículos según el contenido del label. */
export function vehicleSpecIconForLabel(label: string, index = 0): ReactNode {
    const trimmed = label.trim();
    const lower = trimmed.toLowerCase();
    if (/km|kilometraje|kil[oó]metro|\d+\s*k\b|\d+\s*mil\b|\d+\s*h\b|horas?/.test(lower)) {
        return createElement(IconGauge, { size: 18 });
    }
    if (/bencina|gasolina|diesel|diésel|híbrido|hibrido|eléctrico|electrico|gas|petróleo|eléct\./.test(lower)) {
        return createElement(IconGasStation, { size: 18 });
    }
    if (/automático|automatico|automát\.?|manual|cvt|secuencial|secuenc\./i.test(trimmed)) {
        return createElement(IconManualGearbox, { size: 18 });
    }
    if (/^(19|20)\d{2}$/.test(trimmed)) return createElement(IconCar, { size: 18 });
    return specIcon('autos', index);
}

export function buildReelSpecsFromMetaTags(
    metaTags: string[],
    accent: ListingAccent,
    options?: { propertyType?: string | null },
): MarketplaceReelSpec[] {
    const tags = accent === 'propiedades'
        ? orderPropertyCardTags(metaTags, options?.propertyType)
        : orderVehicleCardTags(metaTags);

    return tags.map((label, index) => ({
        icon: accent === 'propiedades'
            ? propertySpecIconForLabel(label)
            : vehicleSpecIconForLabel(label, index),
        label: abbreviateListingSpecLabel(label),
    }));
}

/** Slot vacío: mantiene el ícono del ciclo y muestra "—" en el label. */
export function reelSpecPlaceholder(index: number, accent: ListingAccent = 'autos'): MarketplaceReelSpec {
    return {
        icon: specIcon(accent, index),
        label: '—',
    };
}
