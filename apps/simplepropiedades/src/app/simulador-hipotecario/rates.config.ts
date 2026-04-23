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

// DTI máximo recomendado por bancos
export const DTI_THRESHOLDS = {
  conservative: 25,  // BancoEstado, más estrictos
  moderate: 30,      // Bco. Chile, Santander
  aggressive: 33     // Bci/Itaú, más flexibles
} as const;

// Función helper para mostrar fuente en UI
export function getRateCitation(rate: RateSource): string {
  return `${rate.source} (${rate.lastUpdated})`;
}
