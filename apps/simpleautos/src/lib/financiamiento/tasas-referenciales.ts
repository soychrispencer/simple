/**
 * Parámetros referenciales del mercado de crédito automotriz en Chile.
 *
 * IMPORTANTE: Estos valores son ESTIMACIONES basadas en información pública
 * de bancos, financieras y comparadores (Autofact, tasas.cl, Forum, Crediautos,
 * KMcheck, Autofin) recopilada en julio 2026. NO son una tasa ofrecida por
 * SimpleAutos ni por ninguna entidad financiera específica. Cada institución
 * define su propia tasa según el perfil de riesgo del solicitante.
 *
 * Revisa y ajusta estos números periódicamente (recomendado: cada 3-6 meses,
 * o cuando la CMF publique una nueva Tasa Máxima Convencional).
 *
 * Fuentes usadas para calibrar (julio 2026):
 * - Rango de tasas mensuales bancarias: 0,79% a 1,65% mensual (Autofact, tasas.cl)
 * - CAE competitivo: 9%-12% | CAE promedio: ~14% | CAE alto riesgo: >21% (tasas.cl)
 * - Pie habitual: 10%-50%, típico 20%-30% en bancos, desde 10% en financieras (Autofact, KMcheck)
 * - Plazo típico: 12 a 60 meses (Autofact, Forum)
 * - Carga financiera máxima recomendada: cuota ≤ 30% de renta líquida (Forum, tasas.cl)
 * - Impuesto de Timbres y Estampillas: 0,066% mensual del capital, tope 0,8% (SII, DL 3.475)
 * - Renta líquida mínima habitual: $350.000 - $600.000 dependientes; mayor para independientes
 * - Antigüedad laboral mínima: 12 meses dependientes / 24 meses independientes
 */

export const TASAS = {
  // Tasa mensual (no anual). 3 escenarios en vez de un número falso-preciso.
  mensual: {
    preferencial: 0.0085, // ~0,85% mensual - perfil top, pie alto, plazo corto, banco
    promedioMercado: 0.012, // ~1,2% mensual - perfil estándar
    conservadora: 0.0165, // ~1,65% mensual - perfil de mayor riesgo / financiera
  },
} as const;

export const AJUSTES = {
  // Se suman (en puntos porcentuales mensuales) a promedioMercado y conservadora.
  // "preferencial" no se ajusta: representa el mejor caso posible del mercado.
  vehiculoUsadoMasDe8Anios: 0.003,
  vehiculoUsadoEntre4y8Anios: 0.0012,
  pieMenorA10Porciento: 0.0025,
  pieMayorOIgualA30Porciento: -0.001, // descuento, nunca baja de "preferencial"
  plazoMayorA48Meses: 0.0012,
  trabajadorIndependiente: 0.0012,
} as const;

export const COSTOS_ASOCIADOS = {
  // Seguro de desgravamen: cuota mensual aproximada como % del saldo financiado.
  // Referencial: bancos suelen cobrar entre 0,02% y 0,06% mensual del capital asegurado.
  seguroDesgravamenMensualPct: 0.0004,
  // Gastos operacionales/notariales estimados (fijo, referencial, un solo cobro).
  gastosOperacionalesCLP: 120000,
  // Impuesto de Timbres y Estampillas: 0,066% mensual del capital, tope 0,8% (DL 3.475, SII).
  impuestoTimbresPctMensual: 0.00066,
  impuestoTimbresTope: 0.008,
} as const;

export const LIMITES = {
  cargaFinancieraComoda: 0.25, // cuota+deudas / renta líquida
  cargaFinancieraAjustada: 0.3, // sobre esto, alto riesgo de rechazo
  capacidadMaximaFinanciamiento: 0.3, // % de renta líquida usado para estimar monto máximo
  plazoMinMeses: 12,
  plazoMaxMeses: 60,
  plazoMaxUsadoAntiguo: 36, // recomendado si el vehículo tiene 8+ años
  pieMinNuevoPct: 0.1,
  pieMinUsadoRecientePct: 0.2,
  pieMinUsadoAntiguoPct: 0.3,
  antiguedadVehiculoAltaAnios: 8,
} as const;

export const REQUISITOS_GENERALES = [
  'Cédula de identidad vigente (chilena o extranjero con residencia definitiva).',
  'Edad mínima 18 años (la mayoría de las entidades pide 21-26 años; hasta 65-84 años como tope según entidad).',
  'Renta líquida mínima habitual entre $350.000 y $600.000 (dependiente); usualmente mayor para independientes.',
  'Antigüedad laboral: 12 meses (dependiente) o 24 meses (independiente, con declaración de renta).',
  'Sin morosidades vigentes ni protestos (informe de deuda CMF/DICOM).',
  'Últimas 3 liquidaciones de sueldo o declaraciones de renta, según el caso.',
] as const;
