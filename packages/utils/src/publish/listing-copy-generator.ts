export type AutosCopyInput = {
    brandName: string;
    modelName: string;
    year?: string;
    vehicleType?: string;
    condition?: string;
    color?: string;
    mileage?: string;
    transmission?: string;
    fuelType?: string;
    ownerCount?: string;
    price?: string;
    offerPrice?: string;
    offerPriceMode?: '$' | '%';
    discountPercent?: string;
    negotiable?: boolean;
    financing?: boolean;
    exchange?: boolean;
    maintenanceUpToDate?: boolean;
    technicalReviewUpToDate?: boolean;
    papersUpToDate?: boolean;
    noAccidents?: boolean;
    warranty?: boolean;
    equipmentLabels?: string[];
    listingType?: 'sale' | 'rent' | 'auction';
    platformName?: string;
};

export type PropertyCopyInput = {
    operationType: 'sale' | 'rent' | 'project';
    propertyType: string;
    rooms?: string;
    bathrooms?: string;
    totalArea?: string;
    usableArea?: string;
    communeName?: string | null;
    regionName?: string | null;
    priceLabel?: string;
    condition?: string;
    projectName?: string;
    developerName?: string;
    platformName?: string;
};

function parseDigits(value: string | undefined): string {
    return (value ?? '').replace(/\D/g, '');
}

function formatClp(value: string | undefined): string | null {
    const digits = parseDigits(value);
    if (!digits) return null;
    return `$${Number(digits).toLocaleString('es-CL')}`;
}

export function generateAutosListingTitle(input: AutosCopyInput): string {
    return [input.brandName, input.modelName, input.year].filter(Boolean).join(' ').trim() || 'Vehículo en venta';
}

export function generateAutosListingDescription(input: AutosCopyInput): string {
    const platform = input.platformName ?? 'SimpleAutos';
    const vehicleEmoji = input.vehicleType === 'motorcycle' ? '🏍️'
        : input.vehicleType === 'truck' ? '🚛'
        : input.vehicleType === 'bus' ? '🚌'
        : input.vehicleType === 'nautical' ? '⛵'
        : input.vehicleType === 'aerial' ? '✈️'
        : input.vehicleType === 'machinery' ? '🚜'
        : '🚗';

    const yearNum = input.year ? parseInt(input.year, 10) : null;
    const currentYear = new Date().getFullYear();
    const age = yearNum ? currentYear - yearNum : null;
    const kmNum = input.mileage ? parseInt(parseDigits(input.mileage), 10) : null;

    let hook = '';
    if (input.condition === 'Nuevo') {
        hook = `✨ ${input.brandName} ${input.modelName} 0km, sin uso y listo para transferir.`;
    } else if (input.condition === 'Seminuevo' || (age !== null && age <= 3)) {
        hook = `🌟 ${input.condition === 'Seminuevo' ? 'Seminuevo' : 'Poco uso'}, en excelente estado${kmNum && kmNum < 50000 ? ' y con bajo kilometraje' : ''}.`;
    } else if (input.ownerCount === '1') {
        hook = '👤 Único dueño, mantenido al día y en muy buen estado.';
    } else if (kmNum && kmNum < 80000) {
        hook = `🛣️ Con ${kmNum.toLocaleString('es-CL')} km recorridos, tiene mucha vida por delante.`;
    } else {
        hook = '✅ Vehículo en buen estado, revisado y listo para transferir.';
    }

    const ficha = [
        input.year ? `📅 Año: ${input.year}` : null,
        input.color ? `🎨 Color: ${input.color}` : null,
        kmNum ? `🛣️ Kilometraje: ${kmNum.toLocaleString('es-CL')} km` : null,
        input.transmission ? `⚙️ Transmisión: ${input.transmission}` : null,
        input.fuelType ? `⛽ Combustible: ${input.fuelType}` : null,
        input.condition ? `🔧 Estado: ${input.condition}` : null,
    ].filter(Boolean).join('\n');

    const priceLines: string[] = [];
    const priceFormatted = formatClp(input.price);
    if (priceFormatted) priceLines.push(`💰 Precio: ${priceFormatted}`);
    if (input.negotiable) priceLines.push('💸 Precio conversable');
    if (input.financing) priceLines.push('🏦 Financiamiento disponible');
    if (input.exchange) priceLines.push('🔄 Acepto permuta');

    const features = [
        input.maintenanceUpToDate && '✅ Mantenciones al día',
        input.technicalReviewUpToDate && '✅ Revisión técnica vigente',
        input.papersUpToDate && '✅ Papeles al día',
        input.noAccidents && '✅ Sin accidentes',
        input.warranty && '✅ Con garantía',
    ].filter(Boolean);

    const equipmentLabels = (input.equipmentLabels ?? []).filter(Boolean);
    const equipmentSection = equipmentLabels.length
        ? `\n🛠️ Equipamiento:\n${equipmentLabels.map((label) => `- ${label}`).join('\n')}`
        : '';

    return [
        `${vehicleEmoji} ${input.brandName} ${input.modelName} ${input.year ?? ''} – ¡En venta!`.trim(),
        '',
        hook,
        ficha ? `\n${ficha}` : '',
        priceLines.length ? `\n${priceLines.join('\n')}` : '',
        features.length ? `\n${features.join('\n')}` : '',
        equipmentSection,
        `\n📲 Consulta en ${platform}. Te respondemos de inmediato.`,
    ].filter(Boolean).join('\n').trim();
}

const RESIDENTIAL_PROPERTY_TYPES = new Set(['Casa', 'Departamento']);

export function generatePropertyListingTitle(input: PropertyCopyInput): string {
    if (input.operationType === 'project') {
        return input.projectName?.trim() || 'Proyecto inmobiliario';
    }

    const propertyType = input.propertyType?.trim() ?? '';
    const commune = input.communeName?.trim() ?? '';
    const isResidential = RESIDENTIAL_PROPERTY_TYPES.has(propertyType);

    const head = isResidential
        ? [
              propertyType,
              input.rooms?.trim() ? `${input.rooms.trim()}D` : null,
              input.bathrooms?.trim() ? `${input.bathrooms.trim()}B` : null,
          ].filter(Boolean).join(' ')
        : propertyType;

    if (commune) {
        return head ? `${head} en ${commune}` : commune;
    }

    return head || 'Propiedad disponible';
}

export function generatePropertyListingDescription(input: PropertyCopyInput): string {
    const platform = input.platformName ?? 'SimplePropiedades';
    const location = [input.communeName, input.regionName].filter(Boolean).join(', ');
    const operation = input.operationType === 'rent' ? 'en arriendo'
        : input.operationType === 'project' ? 'proyecto inmobiliario'
        : 'en venta';

    if (input.operationType === 'project') {
        return [
            `🏗️ ${input.projectName || 'Proyecto inmobiliario'} – ${operation}`,
            input.developerName ? `Desarrollado por ${input.developerName}.` : '',
            location ? `📍 Ubicado en ${location}.` : '',
            input.priceLabel ? `💰 Desde ${input.priceLabel}.` : '',
            '',
            `📲 Conoce más detalles y agenda tu visita en ${platform}.`,
        ].filter(Boolean).join('\n').trim();
    }

    const specs = [
        input.rooms?.trim() ? `🛏️ ${input.rooms.trim()} dormitorios` : null,
        input.bathrooms?.trim() ? `🛁 ${input.bathrooms.trim()} baños` : null,
        input.totalArea?.trim() ? `📐 ${input.totalArea.trim()} m² totales` : null,
        input.usableArea?.trim() ? `📏 ${input.usableArea.trim()} m² útiles` : null,
        input.condition ? `🔧 ${input.condition}` : null,
    ].filter(Boolean).join('\n');

    return [
        `🏠 ${input.propertyType} ${operation}${location ? ` en ${location}` : ''}`,
        '',
        'Excelente oportunidad con buena conectividad y entorno.',
        specs ? `\n${specs}` : '',
        input.priceLabel ? `\n💰 ${input.priceLabel}` : '',
        '',
        `📲 Escríbenos en ${platform} para coordinar visita o más información.`,
    ].filter(Boolean).join('\n').trim();
}

export const STANDARD_MARKETPLACE_PUBLISH_STEPS = [
    { key: 'media', label: 'Multimedia', helper: 'Fotos y video para tu aviso' },
    { key: 'details', label: 'Detalles', helper: 'Tipo, atributos y precio' },
    { key: 'publish', label: 'Publicar', helper: 'Ubicación, revisión y compartir' },
] as const;
