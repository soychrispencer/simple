// CONFIGURACIÓN DE TASAS - Actualizar manualmente desde fuentes oficiales
// Fuentes: CMF.cl (tasas promedio), BancoCentral.cl (TPM), cada banco individual
// Última actualización manual: 2026-04-23

export interface RateSource {
  value: number;
  source: string;
  url: string;
  lastUpdated: string;
  notes?: string;
}

export interface MortgageRates {
  // Tasa promedio del mercado (fuente: CMF - Tasa de Interés Promedio sistema bancario)
  averageMarketRate: RateSource;
  
  // Tasa mínima ofrecida por bancos (mejor tasa del mercado)
  bestMarketRate: RateSource;
  
  // Tasa máxima convencional legal (fuente: CMF - TMC)
  maxLegalRate: RateSource;
  
  // Tasa de política monetaria (fuente: Banco Central)
  tpm: RateSource;
  
  // UF del día (fuente: CMF)
  uf: RateSource;
}

// VALORES ACTUALES - ACTUALIZAR SEMANALMENTE DESDE:
// - https://tasas.cmfchile.cl/ (Tasa Promedio)
// - https://www.bcentral.cl (TPM)
// - Bancos individuales (BancoEstado, Bco. Chile, etc.)
export const CURRENT_RATES: MortgageRates = {
  averageMarketRate: {
    value: 4.1, // CMF: Tasa promedio hipotecario marzo 2025
    source: "CMF Chile - Tasa de Interés Promedio del Sistema Bancario",
    url: "https://tasas.cmfchile.cl/",
    lastUpdated: "2025-04-23",
    notes: "Tasa promedio ponderada de créditos hipotecarios nuevos"
  },
  
  bestMarketRate: {
    value: 3.39, // Mejor tasa del mercado (BancoEstado, Bci, etc.)
    source: "Mercado bancario chileno - Mejor tasa disponible",
    url: "https://www.bancoestado.cl/hipotecario",
    lastUpdated: "2025-04-23",
    notes: "Tasa mínima ofrecida por bancos grandes con buen historial crediticio"
  },
  
  maxLegalRate: {
    value: 5.5, // TMC aproximada para hipotecarios
    source: "CMF Chile - Tasa de Interés Máxima Convencional",
    url: "https://tasas.cmfchile.cl/",
    lastUpdated: "2025-04-23",
    notes: "Límite legal que pueden cobrar los bancos"
  },
  
  tpm: {
    value: 5.0, // Tasa de Política Monetaria actual
    source: "Banco Central de Chile",
    url: "https://www.bcentral.cl/areas/estadisticas/tasas-de-interes",
    lastUpdated: "2025-06-13",
    notes: "TPM última reunión de política monetaria"
  },
  
  uf: {
    value: 39643, // Valor UF aproximado
    source: "CMF Chile - Valor diario UF",
    url: "https://api.cmfchile.cl/documentacion/UF.html",
    lastUpdated: "2025-04-23",
    notes: "Actualizar diariamente desde CMF API"
  }
};

// Subsidio DS1 - rebaja sobre tasa (verificar vigencia en MINVU)
export const SUBSIDY_DS1_REDUCTION = 0.87; // 0.87% de rebaja (confirmar valor actual)

// Ajustes por tipo de empleo (datos de mercado real)
export const EMPLOYMENT_FACTORS = {
  dependent: 1.0,      // 100% ingreso reconocido
  independent: 0.75,   // 75% ingreso reconocido (rango 70-80%)
  pensioner: 1.0       // 100% ingreso reconocido (si es AFP estable)
} as const;

// Antigüedad mínima requerida (datos bancarios reales)
export const MIN_EMPLOYMENT_YEARS = {
  dependent: 0.25,     // 3 meses
  independent: 2.0,    // 2 años + 2 declaraciones renta (Form 22)
  pensioner: 0         // Sin antigüedad requerida
} as const;

// FACTORES DE DEUDA SEGÚN TIPO - Cómo los bancos chilenos realmente evalúan cada deuda
// Basado en prácticas de BancoEstado, Bco. Chile, Santander, Bci, Itaú
export const DEBT_TYPE_FACTORS = {
  // Deudas con cuota fija: se consideran al 100%
  dividendoHipotecario: 1.0,  // 100% de la cuota mensual real
  creditoConsumo: 1.0,        // 100% de la cuota mensual
  creditoAutomotriz: 1.0,     // 100% de la cuota mensual
  
  // Tarjetas y líneas de crédito: los bancos consideran un % del límite total
  // NO lo que debes actualmente, sino la capacidad de endeudamiento que tienes disponible
  // Esto es clave: una tarjeta con $5M de límite cuenta como ~$150.000-$500.000 mensual
  // aunque no la uses. Por eso es recomendable reducir límites antes de solicitar hipotecario.
  tarjetaCredito: 0.05,       // 5% del límite total (algunos bancos usan 3-10%)
  lineaCredito: 0.03,         // 3% del límite aprobado (algunos bancos usan 3-5%)
  
  // Otras deudas: generalmente al 100%
  otraDeuda: 1.0,             // 100% según tipo específico
} as const;

// Rangos típicos usados por bancos (para referencia):
// - Tarjeta crédito: Entre 3% y 10% del límite (BancoEstado ~5%, Bci ~3-5%)
// - Línea crédito: Entre 3% y 5% del límite aprobado
// - Algunos bancos más conservadores usan hasta 10% para tarjetas

export interface DebtTypeInfo {
  name: string;
  factor: number;
  description: string;
  bankTreatment: string;
}

export const DEBT_TYPES_INFO: Record<keyof typeof DEBT_TYPE_FACTORS, DebtTypeInfo> = {
  dividendoHipotecario: {
    name: 'Dividendo Hipotecario',
    factor: DEBT_TYPE_FACTORS.dividendoHipotecario,
    description: 'Cuota mensual actual de crédito hipotecario vigente',
    bankTreatment: '100% de la cuota mensual real. Si es segunda vivienda, algunos bancos reducen el % de financiamiento.'
  },
  creditoConsumo: {
    name: 'Crédito de Consumo',
    factor: DEBT_TYPE_FACTORS.creditoConsumo,
    description: 'Créditos de consumo vigentes (Cruz del Sur, CMR, etc.)',
    bankTreatment: '100% de la cuota mensual. Incluye seguros asociados al crédito.'
  },
  creditoAutomotriz: {
    name: 'Crédito Automotriz',
    factor: DEBT_TYPE_FACTORS.creditoAutomotriz,
    description: 'Créditos de vehículos (con o sin prendas)',
    bankTreatment: '100% de la cuota mensual. Si está muy reciente (<6 meses), puede afectar más.'
  },
  tarjetaCredito: {
    name: 'Tarjeta de Crédito',
    factor: DEBT_TYPE_FACTORS.tarjetaCredito,
    description: 'Límites totales de tarjetas de crédito (NO lo que debes, el límite)',
    bankTreatment: '~5% del límite total (no el uso actual). Ej: Tarjeta con $5M de límite = ~$250.000 mensual de carga.'
  },
  lineaCredito: {
    name: 'Línea de Crédito',
    factor: DEBT_TYPE_FACTORS.lineaCredito,
    description: 'Líneas de crédito aprobadas (bancarias, Caja Los Andes, etc.)',
    bankTreatment: '~3% del límite aprobado. Ej: Línea de $10M = ~$300.000 mensual de carga.'
  },
  otraDeuda: {
    name: 'Otras Deudas',
    factor: DEBT_TYPE_FACTORS.otraDeuda,
    description: 'Créditos informales, deudas con familiares, arriendo, etc.',
    bankTreatment: 'Evaluación caso a caso. Algunos bancos no las consideran si no están en DICOM.'
  }
};

// DTI máximo recomendado por bancos - AHORA DINÁMICO POR SEGMENTO
export interface ClientSegment {
  name: string;
  minIncome: number;
  maxIncome: number | null; // null = sin límite superior
  recommendedDTI: number;
  maxDTI: number;
  description: string;
  banks: string[];
}

// SEGMENTOS BASADOS EN DIARIO FINANCIERO Y PRÁCTICA BANCARIA CHILENA
// Fuente: Diario Financiero - Renta líquida mensual para segmento Premium: $2.000.000+
// https://www.df.cl/ (referencia mercado 2024-2025)

export const CLIENT_SEGMENTS: ClientSegment[] = [
  {
    name: 'Estándar',
    minIncome: 0,
    maxIncome: 2_000_000,  // Ajustado: Premium empieza en $2M según DF
    recommendedDTI: 25,
    maxDTI: 30,
    description: 'Perfil convencional. Financiamiento hasta 80%, tasas de mercado. Renta mínima aceptada ~$800.000 en algunos bancos.',
    banks: ['BancoEstado', 'Banco de Chile', 'Santander', 'Bci', 'Itaú', 'Scotiabank']
  },
  {
    name: 'Premium',
    minIncome: 2_000_000,  // Diario Financiero: $2M-$2.5M es el umbral Premium
    maxIncome: 4_000_000,  // Private Banking empieza típicamente entre $3M-$4M
    recommendedDTI: 30,
    maxDTI: 35,
    description: 'Segmento Preferencial. Financiamiento hasta 90%, tasas preferenciales con plan de cuenta/PAC, ejecutivo asignado. Antigüedad mínima: 1 año (dependientes), 2 años (independientes).',
    banks: ['Santander Select', 'Banco de Chile Premier', 'Bci Nova', 'Itaú Personal']
  },
  {
    name: 'Private Banking',
    minIncome: 4_000_000,  // Ajustado para consistencia con mercado
    maxIncome: null,
    recommendedDTI: 30,
    maxDTI: 40,
    description: 'Clientes de alto patrimonio. Financiamiento mayor al 90% según riesgo, tasas negociables, atención personalizada dedicada. Comportamiento financiero impecable requerido.',
    banks: ['Bci Nova Private', 'Itaú Private', 'Banco de Chile Empresas', 'Santander Wealth']
  }
];

// Notas sobre el mercado chileno según Diario Financiero:
// - Renta de entrada Premium: $2.000.000-$2.500.000+
// - Permite acceso a viviendas > 3.600 UF
// - Para tarjetas VIP: algunos bancos exigen >$2.000.000
// - Premium requiere contratar productos adicionales para mejores tasas
// - La renta mínima para crédito estándar es ~$800.000, pero el trato Premium es para rentas altas

// Función para obtener límites DTI según ingreso mensual
export function getDTILimits(monthlyIncome: number): ClientSegment & { 
  recommendedLabel: string; 
  maxLabel: string;
} {
  const segment = CLIENT_SEGMENTS.find(
    s => monthlyIncome >= s.minIncome && (s.maxIncome === null || monthlyIncome < s.maxIncome)
  ) || CLIENT_SEGMENTS[0];
  
  return {
    ...segment,
    recommendedLabel: `${segment.recommendedDTI}% (recomendado)`,
    maxLabel: `${segment.maxDTI}% (límite ${segment.name.toLowerCase()})`
  };
}

// Función helper para mostrar fuente en UI
export function getRateCitation(rate: RateSource): string {
  return `${rate.source} (${rate.lastUpdated})`;
}
