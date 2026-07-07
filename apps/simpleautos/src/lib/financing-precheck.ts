import {
    DEFAULT_MAX_VEHICLE_AGE_YEARS,
    getMinDownPaymentPercent,
    REFERENCE_LOAN_TERM_MONTHS,
    REFERENCE_MAX_PAYMENT_TO_INCOME_RATIO,
    REFERENCE_MIN_MONTHLY_INCOME_CLP,
    resolveBrandMinYear,
    type VehicleUseType,
} from './financing-precheck.config';

export type WorkerType = 'dependent' | 'independent' | 'pensioned';

export type FinancingPrecheckInput = {
    vehiclePrice: number;
    vehicleYear: number;
    vehicleBrand: string;
    vehicleModel?: string;
    vehicleType: VehicleUseType;
    listingId?: string;
    listingTitle?: string;
    canProveIncome: boolean;
    workerType?: WorkerType;
    monthlyIncome: number;
    downPaymentPercent: number;
    hasDicom: boolean;
};

export type PrecheckStatus = 'blocked' | 'review' | 'eligible';

export type FinancingPrecheckResult = {
    status: PrecheckStatus;
    headline: string;
    summary: string;
    warnings: string[];
    blockers: string[];
    documentsHint: string[];
    referenceNotes: string[];
};

function estimateAffordableMonthlyPayment(income: number, workerType?: WorkerType): number {
    const factor = workerType === 'independent' ? 0.85 : 1;
    return Math.floor(income * factor * REFERENCE_MAX_PAYMENT_TO_INCOME_RATIO);
}

function roughMonthlyInstallment(financedAmount: number): number {
    if (financedAmount <= 0) return 0;
    return Math.ceil(financedAmount / REFERENCE_LOAN_TERM_MONTHS);
}

export function evaluateFinancingPrecheck(input: FinancingPrecheckInput): FinancingPrecheckResult {
    const warnings: string[] = [];
    const blockers: string[] = [];
    const referenceNotes: string[] = [
        'Esta precalificación no es una aprobación ni simula cuotas finales.',
        'Las financieras exigen CAE y costo total del crédito antes de contratar (SERNAC).',
    ];

    const minPie = getMinDownPaymentPercent(input.vehicleType);
    const minYear = resolveBrandMinYear(input.vehicleBrand);
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - input.vehicleYear;

    if (!input.canProveIncome) {
        return {
            status: 'blocked',
            headline: 'No es posible continuar sin acreditar ingresos',
            summary: 'Actualmente no es posible continuar con la evaluación para financiamiento sin comprobantes de ingreso (liquidaciones, boletas o pensión).',
            warnings: [],
            blockers: ['Sin ingresos acreditables no es posible precalificar para financiamiento formal.'],
            documentsHint: [],
            referenceNotes,
        };
    }

    if (input.vehiclePrice <= 0) {
        blockers.push('Indica un precio válido del vehículo.');
    }

    if (input.vehicleYear < minYear) {
        blockers.push(`Para ${input.vehicleBrand || 'esta marca'}, el año del vehículo suele ser ${minYear} o posterior según políticas de financieras.`);
    }

    if (vehicleAge > DEFAULT_MAX_VEHICLE_AGE_YEARS) {
        blockers.push(`El vehículo supera ${DEFAULT_MAX_VEHICLE_AGE_YEARS} años de antigüedad, límite habitual en financiamiento automotriz.`);
    }

    if (input.monthlyIncome < REFERENCE_MIN_MONTHLY_INCOME_CLP) {
        blockers.push(`El ingreso informado está por debajo del mínimo de referencia (${REFERENCE_MIN_MONTHLY_INCOME_CLP.toLocaleString('es-CL')} líquidos).`);
    }

    if (input.downPaymentPercent < minPie) {
        blockers.push(`El pie debe ser al menos ${minPie}% para vehículos ${input.vehicleType === 'carga' ? 'de carga' : 'de este tipo'}.`);
    }

    const downAmount = Math.round(input.vehiclePrice * (input.downPaymentPercent / 100));
    const financed = Math.max(0, input.vehiclePrice - downAmount);
    const estimatedInstallment = roughMonthlyInstallment(financed);
    const affordable = estimateAffordableMonthlyPayment(input.monthlyIncome, input.workerType);

    if (financed > 0 && estimatedInstallment > affordable) {
        warnings.push(
            `Con el pie indicado, la cuota estimada de referencia (~${estimatedInstallment.toLocaleString('es-CL')}) podría superar el 25% del ingreso líquido. Una financiera podría pedir mayor pie o plazo distinto.`,
        );
    }

    if (input.workerType === 'independent') {
        warnings.push('Trabajadores independientes suelen requerir más antigüedad y boletas de honorarios; el pie puede ser mayor al estándar del 20%.');
    }

    if (input.hasDicom) {
        warnings.push('El financiamiento está sujeto a evaluación y normalmente se requiere no mantener deudas en DICOM, o bien un pie mayor y tasas distintas.');
    }

    const documentsHint = [
        'Cédula de identidad vigente',
        'Últimas 3 liquidaciones de sueldo (dependiente) o boletas de honorarios (independiente)',
        'Certificado de cotizaciones AFP o liquidación de pensión (pensionado)',
    ];

    if (blockers.length > 0) {
        return {
            status: 'blocked',
            headline: 'Perfil con requisitos pendientes',
            summary: 'Con la información ingresada, aún no cumples los requisitos básicos de referencia para ser derivado a evaluación crediticia.',
            warnings,
            blockers,
            documentsHint,
            referenceNotes,
        };
    }

    const status: PrecheckStatus = warnings.length > 0 ? 'review' : 'eligible';

    return {
        status,
        headline: status === 'eligible'
            ? 'Tu perfil puede ser evaluado'
            : 'Tu perfil puede ser evaluado con observaciones',
        summary: 'Según la información ingresada, tu perfil cumple los requisitos básicos para ser evaluado por entidades financieras asociadas. La aprobación final depende de cada financiera.',
        warnings,
        blockers: [],
        documentsHint,
        referenceNotes,
    };
}

export function buildFinancingLeadMailto(input: FinancingPrecheckInput & {
    contactName: string;
    contactRut: string;
    contactPhone: string;
    contactEmail: string;
}, result: FinancingPrecheckResult): string {
    const subject = encodeURIComponent(`Precalificación financiamiento · ${input.vehicleBrand || 'Vehículo'} ${input.vehicleYear}`);
    const body = encodeURIComponent([
        'Solicitud de precalificación — SimpleAutos',
        '',
        `Estado: ${result.status}`,
        `Resumen: ${result.summary}`,
        '',
        '--- Vehículo ---',
        `Título/listing: ${input.listingTitle || '—'}`,
        `ID publicación: ${input.listingId || '—'}`,
        `Marca: ${input.vehicleBrand}`,
        `Modelo: ${input.vehicleModel || '—'}`,
        `Año: ${input.vehicleYear}`,
        `Tipo: ${input.vehicleType}`,
        `Precio: $${input.vehiclePrice.toLocaleString('es-CL')}`,
        `Pie: ${input.downPaymentPercent}%`,
        '',
        '--- Cliente ---',
        `Nombre: ${input.contactName}`,
        `RUT: ${input.contactRut}`,
        `Teléfono: ${input.contactPhone}`,
        `Email: ${input.contactEmail}`,
        `Acredita ingresos: Sí`,
        `Tipo trabajador: ${input.workerType || '—'}`,
        `Ingreso líquido: $${input.monthlyIncome.toLocaleString('es-CL')}`,
        `DICOM: ${input.hasDicom ? 'Sí' : 'No'}`,
        '',
        result.warnings.length ? `Observaciones:\n${result.warnings.map((w) => `• ${w}`).join('\n')}` : '',
        '',
        'Documentos a enviar: RUT + 3 últimas liquidaciones (o equivalente según tipo de trabajador).',
    ].filter(Boolean).join('\n'));
    return `mailto:hola@simpleplataforma.app?subject=${subject}&body=${body}`;
}

export function buildPrecheckHrefFromListing(item: {
    id: string;
    title: string;
    price: string;
    summary: string[];
    brandId?: string;
    modelId?: string;
}): string {
    const params = new URLSearchParams();
    const priceDigits = item.price.replace(/[^\d]/g, '');
    if (priceDigits) params.set('precio', priceDigits);
    params.set('titulo', item.title);
    params.set('listingId', item.id);
    const year = item.summary.find((tag) => /^\d{4}$/.test(tag));
    if (year) params.set('anio', year);
    if (item.brandId) {
        params.set('marca', item.brandId);
    } else {
        const brandGuess = item.title.trim().split(/\s+/)[0];
        if (brandGuess) params.set('marca', brandGuess);
    }
    if (item.modelId) params.set('modelo', item.modelId);
    return `/precalificacion-financiamiento?${params.toString()}`;
}
