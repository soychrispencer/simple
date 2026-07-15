/**
 * Parámetros referenciales del mercado de crédito hipotecario en Chile (jul 2026).
 * Estimaciones públicas — no son oferta de SimplePropiedades ni de un banco.
 */

export const VALOR_UF_REFERENCIAL = 40845;

export const TASAS_ANUALES = {
  preferencial: 0.0339,
  promedioMercado: 0.041,
  conservadora: 0.0599,
} as const;

export const AJUSTES_ANUALES = {
  financiamientoSobre80Porciento: 0.003,
  viviendaUsada: 0.001,
  plazoMayorA25Anios: 0.001,
  trabajadorIndependiente: 0.0015,
  segundaVivienda: 0.0025,
} as const;

export const COSTOS_ASOCIADOS = {
  /** Desgravamen base mensual sobre saldo; sube con edad. */
  seguroDesgravamenMensualPct: 0.00018,
  /** Incendio / sismo referencial mensual. */
  seguroIncendioSismoMensualPct: 0.00012,
  gastosOperacionalesPctMonto: 0.012,
  impuestoMutuoPct: 0.004,
} as const;

export const FACTOR_DESGRAVAMEN_EDAD = [
  { hasta: 40, factor: 1 },
  { hasta: 50, factor: 1.3 },
  { hasta: 60, factor: 1.8 },
  { hasta: 99, factor: 2.5 },
] as const;

export const LIMITES = {
  dividendoComodoPct: 0.25,
  dividendoAjustadoPct: 0.3,
  capacidadMaximaFinanciamiento: 0.25,
  rentaReconocidaIndependiente: 0.65,
  plazoMinAnios: 5,
  plazoMaxAnios: 30,
  financiamientoMinPct: 0.5,
  financiamientoMaxPct: 0.9,
  financiamientoRecomendadoPct: 0.8,
  financiamientoMaxSegundaViviendaPct: 0.7,
  pieMinSegundaViviendaPct: 0.2,
  edadMinima: 18,
  edadMaxAlTermino: 80,
} as const;

export const REQUISITOS_GENERALES = [
  'Cédula vigente y residencia definitiva si aplica.',
  'Renta líquida habitual desde ~$500.000 (varía por banco).',
  'Antigüedad laboral: 6–12 meses dependiente / 12–24 independiente.',
  'Sin morosidades ni protestos vigentes.',
  'Pie habitual 10%–20% + gastos operacionales.',
] as const;
