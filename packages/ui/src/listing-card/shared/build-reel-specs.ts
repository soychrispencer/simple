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
    // Residencial: dorm / baño / est. / bodega
    const propCycle = [IconBed, IconBath, IconParking, IconBox];
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
    if (/m²|m2|metros|superficie/.test(lower)) return createElement(IconRuler, { size: 18 });
    return createElement(IconBuilding, { size: 18 });
}

/** Ubicación corta para cards: solo la comuna. */
export function shortenListingLocation(location: string): string {
    const trimmed = location.replace(/\s+/g, ' ').trim();
    if (!trimmed) return trimmed;

    const parts = trimmed
        .split(/\s*(?:,|·|\||\/|-)\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) return trimmed;

    const isRegionLike = (value: string) =>
        /^(regi[oó]n|rm|chile|metropolitana)\b/i.test(value)
        || /\bregi[oó]n\b/i.test(value);

    const commune = parts.find((part) => !isRegionLike(part)) ?? parts[0];
    if (commune.length > 28) return `${commune.slice(0, 27)}…`;
    return commune;
}

/** Compacta labels de specs para cards (1 dormitorio → 1D, 2 baños → 2B, etc.). */
export function abbreviateListingSpecLabel(label: string): string {
    const trimmed = label
        .normalize('NFKC')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!trimmed) return trimmed;

    const dorm = trimmed.match(/^(\d+)\s*(dormitorios?|dorm\.?|habitaciones?|hab\.?|d)$/i);
    if (dorm) return `${dorm[1]}D`;

    const bath = trimmed.match(/^(\d+)\s*(baños?|banos?|b)$/i);
    if (bath) return `${bath[1]}B`;

    const parking = trimmed.match(/^(\d+)\s*(est\.?|estacionamientos?|e)$/i);
    if (parking) return `${parking[1]}E`;

    const storage = trimmed.match(/^(\d+)\s*(bod\.?|bodegas?|bo)$/i);
    if (storage) return `${storage[1]}Bo`;

    const surface = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(m²|m2|mt2|mts?²?)$/i);
    if (surface) return `${surface[1].replace(',', '.')}m²`;

    const km = trimmed.match(/^([\d.\s,]+)\s*(km|kil[oó]metros?)$/i);
    if (km) {
        const digits = km[1].replace(/[^\d]/g, '');
        const num = Number(digits);
        if (!Number.isNaN(num) && num >= 1000) {
            return `${Math.round(num / 1000)}k`;
        }
        if (!Number.isNaN(num) && num > 0) return `${num}km`;
        return 'km';
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'automático' || lower === 'automatico' || lower === 'automática' || lower === 'automatica') return 'Auto';
    if (lower === 'manual') return 'Man';
    if (lower === 'seminuevo' || lower === 'semi-nuevo' || lower === 'semi nuevo') return 'Semi';
    if (lower === 'nuevo') return 'Nuevo';
    if (lower === 'departamento') return 'Depto';
    if (lower === 'estacionamiento' || lower === 'estacionamientos') return 'Est.';
    if (lower === 'bodega' || lower === 'bodegas') return 'Bod.';
    if (lower === 'bencina' || lower === 'gasolina') return 'Benc.';
    if (lower === 'diésel' || lower === 'diesel') return 'Dies.';
    if (lower === 'híbrido' || lower === 'hibrido') return 'Híb.';
    if (lower === 'eléctrico' || lower === 'electrico') return 'Elec.';
    if (lower === 'sedán' || lower === 'sedan') return 'Sedán';
    if (lower === 'camioneta' || lower === 'pickup') return 'Pick.';
    if (lower === 'hatchback') return 'Hatch';

    if (trimmed.length > 7) return `${trimmed.slice(0, 6)}…`;
    return trimmed;
}

export function isResidentialPropertyType(propertyType?: string | null): boolean {
    const value = (propertyType ?? '').toLowerCase();
    return /casa|depto|departamento|townhouse|loft|penthouse|duplex|dúplex|studio|estudio/.test(value);
}

function pickTag(tags: string[], patterns: RegExp[]): string | null {
    const index = tags.findIndex((tag) => patterns.some((pattern) => pattern.test(tag)));
    if (index < 0) return null;
    const [value] = tags.splice(index, 1);
    return value;
}

/**
 * Ordena tags de propiedades para cards.
 * Residencial: dorm → baño → est. → bodega.
 */
export function orderPropertyCardTags(tags: string[], propertyType?: string | null): string[] {
    const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
    if (normalized.length === 0) return [];

    if (isResidentialPropertyType(propertyType) || normalized.some((tag) => /^\d+\s*D$/i.test(tag) || /dorm|hab/i.test(tag))) {
        const ordered = [
            pickTag(normalized, [/^\d+\s*D$/i, /dorm|hab/i]),
            pickTag(normalized, [/^\d+\s*B$/i, /baño|bano/i]),
            pickTag(normalized, [/^\d+\s*E$/i, /est\.?|estacionamiento/i]),
            pickTag(normalized, [/^\d+\s*Bo$/i, /bod|bodega/i]),
        ].filter(Boolean) as string[];
        return ordered.slice(0, 4);
    }

    const ordered = [
        pickTag(normalized, [/casa|departamento|depto|oficina|terreno|local|bodega|estacionamiento/i]),
        pickTag(normalized, [/m²|m2|metros|superficie/i]),
        pickTag(normalized, [/est\.?|estacionamiento/i]),
        pickTag(normalized, [/unidad/i]),
    ].filter(Boolean) as string[];

    return [...ordered, ...normalized].slice(0, 4);
}

/**
 * Ordena tags de vehículos para cards.
 * Año → tipo → km → combustible (transmisión si cabe).
 */
export function orderVehicleCardTags(tags: string[]): string[] {
    const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
    if (normalized.length === 0) return [];

    const ordered = [
        pickTag(normalized, [/^(19|20)\d{2}$/]),
        pickTag(normalized, [/auto|sedán|sedan|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible/i]),
        pickTag(normalized, [/km|kilometraje|kil[oó]metro/i]),
        pickTag(normalized, [/bencina|gasolina|diesel|diésel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i]),
        pickTag(normalized, [/automático|automatico|manual|cvt|secuencial/i]),
        pickTag(normalized, [/usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i]),
    ].filter(Boolean) as string[];

    return [...ordered, ...normalized].slice(0, 4);
}

/** Ícono de spec de vehículos según el contenido del label. */
export function vehicleSpecIconForLabel(label: string, index = 0): ReactNode {
    const trimmed = label.trim();
    const lower = trimmed.toLowerCase();
    if (/km|kilometraje|kil[oó]metro|\d+\s*k\b/.test(lower)) return createElement(IconGauge, { size: 18 });
    if (/bencina|gasolina|diesel|diésel|híbrido|hibrido|eléctrico|electrico|gas|petróleo|benc\.|dies\.|híb\.|elec\./.test(lower)) {
        return createElement(IconGasStation, { size: 18 });
    }
    if (/^(automático|automatico|manual|cvt|secuencial|auto|man)$/i.test(trimmed)) {
        return createElement(IconManualGearbox, { size: 18 });
    }
    if (/^(19|20)\d{2}$/.test(trimmed)) return createElement(IconCar, { size: 18 });
    return specIcon('autos', index);
}

export function buildReelSpecsFromMetaTags(metaTags: string[], accent: ListingAccent): MarketplaceReelSpec[] {
    const tags = accent === 'propiedades'
        ? orderPropertyCardTags(metaTags)
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
