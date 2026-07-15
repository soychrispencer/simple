/**
 * Parámetros referenciales del mercado de crédito automotriz en Chile.
 *
 * IMPORTANTE: son ESTIMACIONES basadas en información pública (bancos,
 * financieras automotrices, Autofact, tasas.cl, Forum, Tanner, etc.).
 * NO son una oferta de SimpleAutos ni de una entidad específica. Cada
 * financiera define pie, plazo, tasa y elegibilidad según evaluación comercial.
 *
 * Fuentes usadas para calibrar (julio 2026):
 * - Pie habitual referencial ~20% en usados; captivas a veces desde 0–10% en nuevo
 * - Pie 35–50%+ suele ser política de riesgo (antigüedad, perfil, DICOM), no una lista de marcas
 * - Plazo típico 12–60 meses; usados antiguos a menudo capados a ~36 meses
 * - Carga financiera máxima recomendada: cuota ≤ 30% de renta líquida
 * - Independientes: bancos suelen reconocer ~60% de la renta
 * - DICOM: no es rechazo automático; sí eleva pie/aval o puede cerrar opciones
 * - Impuesto de Timbres y Estampillas: 0,066% mensual del capital, tope 0,8% (SII)
 */

export const TASAS = {
  mensual: {
    preferencial: 0.0085, // ~0,85% mensual - perfil top, pie alto, plazo corto
    promedioMercado: 0.012, // ~1,2% mensual - perfil estándar
    conservadora: 0.0165, // ~1,65% mensual - mayor riesgo / financiera
  },
} as const;

export const AJUSTES = {
  vehiculoUsadoMasDe8Anios: 0.003,
  vehiculoUsadoEntre4y8Anios: 0.0012,
  pieMenorA20Porciento: 0.0015,
  pieMenorA10Porciento: 0.0025,
  pieMayorOIgualA30Porciento: -0.001,
  plazoMayorA48Meses: 0.0012,
  trabajadorIndependiente: 0.0012,
  /** Ajuste de tasa referencial; no implica rechazo. */
  antecedentesComerciales: 0.002,
} as const;

export const COSTOS_ASOCIADOS = {
  seguroDesgravamenMensualPct: 0.00035,
  seguroCesantiaMensualPct: 0.00012,
  gastosOperacionalesCLP: 120000,
  impuestoTimbresPctMensual: 0.00066,
  impuestoTimbresTope: 0.008,
} as const;

export const FACTOR_DESGRAVAMEN_EDAD = [
  { hasta: 40, factor: 1 },
  { hasta: 50, factor: 1.25 },
  { hasta: 60, factor: 1.7 },
  { hasta: 99, factor: 2.3 },
] as const;

export const LIMITES = {
  cargaFinancieraComoda: 0.25,
  cargaFinancieraAjustada: 0.3,
  capacidadMaximaFinanciamiento: 0.3,
  rentaReconocidaIndependiente: 0.6,
  plazoMinMeses: 12,
  plazoMaxMeses: 60,
  plazoMaxUsadoAntiguo: 36,
  plazoMaxUsadoMuyAntiguo: 24,
  /** Habitual de mercado; campañas captivas pueden ser menores. */
  pieMinNuevoPct: 0.2,
  pieMinUsadoRecientePct: 0.2,
  /** Alineado a políticas tipo Tanner (~40%) en usados más antiguos. */
  pieMinUsadoAntiguoPct: 0.4,
  pieMinUsadoMuyAntiguoPct: 0.5,
  pieTopeSugeridoPct: 0.55,
  /** Umbral donde empieza a pedirse más pie / menos plazo. */
  antiguedadVehiculoAltaAnios: 6,
  antiguedadVehiculoMuyAltaAnios: 10,
  edadMinima: 21,
  edadMaxAlTermino: 75,
} as const;

export const REQUISITOS_GENERALES = [
  'Cédula de identidad vigente (chilena o extranjero con residencia definitiva).',
  'Edad habitual desde 21 años; tope al término del crédito suele estar entre 65 y 75 según entidad.',
  'Renta líquida mínima habitual entre $350.000 y $600.000 (dependiente); usualmente mayor para independientes.',
  'Antigüedad laboral: 12 meses (dependiente) o 24 meses (independiente, con declaración de renta).',
  'Antecedentes comerciales (CMF/DICOM): se evalúan caso a caso; no equivalen a un rechazo automático.',
  'Últimas 3 liquidaciones de sueldo o declaraciones de renta, según el caso.',
] as const;
