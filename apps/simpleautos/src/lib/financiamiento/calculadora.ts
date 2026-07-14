import {
  AJUSTES,
  COSTOS_ASOCIADOS,
  LIMITES,
  TASAS,
} from './tasas-referenciales';

export type TipoVehiculo = 'nuevo' | 'usado';
export type TipoTrabajador = 'dependiente' | 'independiente';
export type NivelEscenario = 'preferencial' | 'promedioMercado' | 'conservadora';

export interface SimuladorInput {
  precioVehiculo: number;
  tipoVehiculo: TipoVehiculo;
  anioVehiculo: number;
  pieMonto: number;
  plazoMeses: number;
  rentaLiquida: number;
  tipoTrabajador: TipoTrabajador;
  otrasDeudasMensuales: number;
}

export interface EscenarioResultado {
  nivel: NivelEscenario;
  etiqueta: string;
  tasaMensual: number;
  tasaAnualAprox: number;
  cuotaCredito: number; // solo capital + interés (francés)
  seguroDesgravamenMensual: number;
  cuotaTotalMensual: number; // cuota + seguro
  gastosOperacionales: number;
  impuestoTimbres: number;
  costoTotalCredito: number; // suma de todas las cuotas totales + costos iniciales
  caeReferencial: number; // aproximación, no reemplaza el CAE legal
}

export type NivelRiesgoCarga = 'comoda' | 'ajustada' | 'alta';

export interface ResultadoSimulacion {
  montoAFinanciar: number;
  pieEfectivoPct: number;
  antiguedadVehiculo: number;
  escenarios: EscenarioResultado[];
  cargaFinanciera: {
    nivel: NivelRiesgoCarga;
    porcentajeSobreRenta: number; // usando el escenario "promedioMercado"
  };
  montoMaximoReferencial: number;
  pieMinimoSugeridoPct: number;
  plazoMaxSugerido: number;
  advertencias: string[];
}

function cuotaFrancesa(monto: number, tasaMensual: number, n: number): number {
  if (n <= 0) return 0;
  if (tasaMensual <= 0) return monto / n;
  const factor = Math.pow(1 + tasaMensual, -n);
  return (monto * tasaMensual) / (1 - factor);
}

function calcularTasasAjustadas(input: SimuladorInput, antiguedad: number) {
  const piePct = input.precioVehiculo > 0 ? input.pieMonto / input.precioVehiculo : 0;

  let ajuste = 0;
  if (input.tipoVehiculo === 'usado') {
    if (antiguedad > LIMITES.antiguedadVehiculoAltaAnios) {
      ajuste += AJUSTES.vehiculoUsadoMasDe8Anios;
    } else if (antiguedad >= 4) {
      ajuste += AJUSTES.vehiculoUsadoEntre4y8Anios;
    }
  }
  if (piePct < 0.1) {
    ajuste += AJUSTES.pieMenorA10Porciento;
  } else if (piePct >= 0.3) {
    ajuste += AJUSTES.pieMayorOIgualA30Porciento;
  }
  if (input.plazoMeses > 48) {
    ajuste += AJUSTES.plazoMayorA48Meses;
  }
  if (input.tipoTrabajador === 'independiente') {
    ajuste += AJUSTES.trabajadorIndependiente;
  }

  return {
    preferencial: TASAS.mensual.preferencial,
    promedioMercado: Math.max(
      TASAS.mensual.preferencial,
      TASAS.mensual.promedioMercado + ajuste
    ),
    conservadora: Math.max(
      TASAS.mensual.promedioMercado,
      TASAS.mensual.conservadora + ajuste
    ),
  };
}

function construirEscenario(
  nivel: NivelEscenario,
  etiqueta: string,
  tasaMensual: number,
  monto: number,
  plazoMeses: number
): EscenarioResultado {
  const cuotaCredito = cuotaFrancesa(monto, tasaMensual, plazoMeses);
  const seguroDesgravamenMensual =
    monto * COSTOS_ASOCIADOS.seguroDesgravamenMensualPct;
  const cuotaTotalMensual = cuotaCredito + seguroDesgravamenMensual;
  const gastosOperacionales = COSTOS_ASOCIADOS.gastosOperacionalesCLP;
  const impuestoTimbres = Math.min(
    monto * COSTOS_ASOCIADOS.impuestoTimbresPctMensual * plazoMeses,
    monto * COSTOS_ASOCIADOS.impuestoTimbresTope
  );

  const costoTotalCredito =
    cuotaTotalMensual * plazoMeses + gastosOperacionales + impuestoTimbres;

  const tasaAnualAprox = Math.pow(1 + tasaMensual, 12) - 1;
  // CAE referencial simplificado: interés compuesto anualizado + costo anualizado
  // de seguros/gastos/impuesto como proporción del capital. No es el CAE legal
  // (que exige la metodología exacta de la entidad financiera).
  const plazoAnios = plazoMeses / 12;
  const costoAnualizadoExtra =
    monto > 0
      ? (seguroDesgravamenMensual * 12 +
          (gastosOperacionales + impuestoTimbres) / Math.max(plazoAnios, 1)) /
        monto
      : 0;
  const caeReferencial = tasaAnualAprox + costoAnualizadoExtra;

  return {
    nivel,
    etiqueta,
    tasaMensual,
    tasaAnualAprox,
    cuotaCredito,
    seguroDesgravamenMensual,
    cuotaTotalMensual,
    gastosOperacionales,
    impuestoTimbres,
    costoTotalCredito,
    caeReferencial,
  };
}

export function simular(input: SimuladorInput): ResultadoSimulacion {
  const anioActual = new Date().getFullYear();
  const antiguedad =
    input.tipoVehiculo === 'usado'
      ? Math.max(anioActual - input.anioVehiculo, 0)
      : 0;

  const pieMonto = Math.min(Math.max(input.pieMonto, 0), input.precioVehiculo);
  const montoAFinanciar = Math.max(input.precioVehiculo - pieMonto, 0);
  const pieEfectivoPct =
    input.precioVehiculo > 0 ? pieMonto / input.precioVehiculo : 0;

  const tasas = calcularTasasAjustadas(input, antiguedad);
  const plazoMeses = Math.min(
    Math.max(input.plazoMeses, LIMITES.plazoMinMeses),
    LIMITES.plazoMaxMeses
  );

  const escenarios: EscenarioResultado[] = [
    construirEscenario(
      'preferencial',
      'Tasa preferencial (mejor perfil)',
      tasas.preferencial,
      montoAFinanciar,
      plazoMeses
    ),
    construirEscenario(
      'promedioMercado',
      'Promedio de mercado',
      tasas.promedioMercado,
      montoAFinanciar,
      plazoMeses
    ),
    construirEscenario(
      'conservadora',
      'Escenario conservador',
      tasas.conservadora,
      montoAFinanciar,
      plazoMeses
    ),
  ];

  // Carga financiera evaluada con el escenario de mercado (el más representativo).
  const cuotaReferencia = escenarios[1].cuotaTotalMensual;
  const totalCompromisoMensual = cuotaReferencia + input.otrasDeudasMensuales;
  const porcentajeSobreRenta =
    input.rentaLiquida > 0 ? totalCompromisoMensual / input.rentaLiquida : 1;

  let nivelCarga: NivelRiesgoCarga = 'comoda';
  if (porcentajeSobreRenta > LIMITES.cargaFinancieraAjustada) {
    nivelCarga = 'alta';
  } else if (porcentajeSobreRenta > LIMITES.cargaFinancieraComoda) {
    nivelCarga = 'ajustada';
  }

  // Monto máximo referencial: cuánto podría financiar según el 30% de su renta,
  // usando la tasa promedio de mercado como referencia.
  const capacidadMensualDisponible = Math.max(
    input.rentaLiquida * LIMITES.capacidadMaximaFinanciamiento -
      input.otrasDeudasMensuales,
    0
  );
  const tasaRef = tasas.promedioMercado;
  const montoMaximoReferencial =
    tasaRef > 0
      ? (capacidadMensualDisponible * (1 - Math.pow(1 + tasaRef, -plazoMeses))) /
        tasaRef
      : capacidadMensualDisponible * plazoMeses;

  // Pie mínimo sugerido según tipo y antigüedad del vehículo.
  let pieMinimoSugeridoPct: number = LIMITES.pieMinNuevoPct;
  let plazoMaxSugerido: number = LIMITES.plazoMaxMeses;
  if (input.tipoVehiculo === 'usado') {
    if (antiguedad > LIMITES.antiguedadVehiculoAltaAnios) {
      pieMinimoSugeridoPct = LIMITES.pieMinUsadoAntiguoPct;
      plazoMaxSugerido = LIMITES.plazoMaxUsadoAntiguo;
    } else {
      pieMinimoSugeridoPct = LIMITES.pieMinUsadoRecientePct;
    }
  }

  const advertencias: string[] = [];
  if (pieEfectivoPct < pieMinimoSugeridoPct) {
    advertencias.push(
      `El pie ingresado (${(pieEfectivoPct * 100).toFixed(
        0
      )}%) está bajo el mínimo habitual para este tipo de vehículo (~${(
        pieMinimoSugeridoPct * 100
      ).toFixed(0)}%). Esto puede subir la tasa o exigir un aval.`
    );
  }
  if (plazoMeses > plazoMaxSugerido) {
    advertencias.push(
      `Para un vehículo con esta antigüedad, la mayoría de las entidades limita el plazo a ${plazoMaxSugerido} meses.`
    );
  }
  if (nivelCarga === 'alta') {
    advertencias.push(
      'La cuota estimada supera el 30% de la renta líquida declarada. Es el principal motivo de rechazo en evaluaciones de crédito automotriz.'
    );
  }
  if (input.rentaLiquida > 0 && input.rentaLiquida < 350000) {
    advertencias.push(
      'La renta líquida ingresada está bajo el mínimo habitual exigido por la mayoría de las entidades (~$350.000).'
    );
  }

  return {
    montoAFinanciar,
    pieEfectivoPct,
    antiguedadVehiculo: antiguedad,
    escenarios,
    cargaFinanciera: {
      nivel: nivelCarga,
      porcentajeSobreRenta,
    },
    montoMaximoReferencial,
    pieMinimoSugeridoPct,
    plazoMaxSugerido,
    advertencias,
  };
}

export function formatCLP(valor: number): string {
  return valor.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

export function formatPct(valor: number, decimales = 1): string {
  return `${(valor * 100).toFixed(decimales)}%`;
}
