import { cuotaFrancesa, formatCLP, formatPct, type NivelRiesgoCarga } from '@simple/simulador-ui';
import {
  AJUSTES,
  COSTOS_ASOCIADOS,
  FACTOR_DESGRAVAMEN_EDAD,
  LIMITES,
  TASAS,
} from './tasas-referenciales';

export { formatCLP, formatPct };

export type TipoVehiculo = 'nuevo' | 'usado';
export type TipoTrabajador = 'dependiente' | 'independiente';
export type NivelEscenario = 'preferencial' | 'promedioMercado' | 'conservadora';
export type NivelAccesoPie = 'favorable' | 'estandar' | 'exigente' | 'muy_exigente';

export interface SimuladorInput {
  precioVehiculo: number;
  tipoVehiculo: TipoVehiculo;
  anioVehiculo: number;
  pieMonto: number;
  plazoMeses: number;
  rentaLiquida: number;
  tipoTrabajador: TipoTrabajador;
  otrasDeudasMensuales: number;
  edad: number;
  tieneDicom: boolean;
}

export interface EscenarioResultado {
  nivel: NivelEscenario;
  etiqueta: string;
  tasaMensual: number;
  tasaAnualAprox: number;
  cuotaCredito: number;
  seguroDesgravamenMensual: number;
  seguroCesantiaMensual: number;
  cuotaTotalMensual: number;
  gastosOperacionales: number;
  impuestoTimbres: number;
  costoTotalCredito: number;
  caeReferencial: number;
}

export interface PerfilPiePlazo {
  pieMinimoSugeridoPct: number;
  plazoMaxSugerido: number;
  nivelAcceso: NivelAccesoPie;
  resumenPerfil: string;
  antiguedadVehiculo: number;
}

export interface ResultadoSimulacion {
  montoAFinanciar: number;
  pieEfectivoPct: number;
  antiguedadVehiculo: number;
  rentaReconocida: number;
  escenarios: EscenarioResultado[];
  cargaFinanciera: {
    nivel: NivelRiesgoCarga;
    porcentajeSobreRenta: number;
  };
  montoMaximoReferencial: number;
  pieMinimoSugeridoPct: number;
  plazoMaxSugerido: number;
  nivelAcceso: NivelAccesoPie;
  resumenPerfil: string;
  advertencias: string[];
}

function factorDesgravamen(edad: number): number {
  for (const fila of FACTOR_DESGRAVAMEN_EDAD) {
    if (edad <= fila.hasta) return fila.factor;
  }
  return FACTOR_DESGRAVAMEN_EDAD[FACTOR_DESGRAVAMEN_EDAD.length - 1].factor;
}

function rentaReconocidaDe(input: SimuladorInput): number {
  if (input.tipoTrabajador === 'independiente') {
    return input.rentaLiquida * LIMITES.rentaReconocidaIndependiente;
  }
  return input.rentaLiquida;
}

function clampPie(pct: number): number {
  return Math.min(Math.max(pct, 0), LIMITES.pieTopeSugeridoPct);
}

/**
 * Pie y plazo habituales referenciales según tipo, antigüedad y perfil.
 * No declara “financiable / no financiable”: solo orienta la simulación.
 */
export function estimarPieYPlazoSugeridos(input: {
  tipoVehiculo: TipoVehiculo;
  anioVehiculo: number;
  tipoTrabajador?: TipoTrabajador;
  tieneDicom?: boolean;
  edad?: number;
}): PerfilPiePlazo {
  const anioActual = new Date().getFullYear();
  const antiguedadVehiculo =
    input.tipoVehiculo === 'usado' && input.anioVehiculo > 0
      ? Math.max(anioActual - input.anioVehiculo, 0)
      : 0;

  let pieMinimoSugeridoPct: number = LIMITES.pieMinNuevoPct;
  let plazoMaxSugerido: number = LIMITES.plazoMaxMeses;
  let nivelAcceso: NivelAccesoPie = 'estandar';
  let resumenPerfil = 'Pie habitual de mercado (~20%).';

  if (input.tipoVehiculo === 'nuevo') {
    pieMinimoSugeridoPct = LIMITES.pieMinNuevoPct;
    nivelAcceso = 'favorable';
    resumenPerfil = 'Nuevo: pie habitual ~20% (algunas captivas ofrecen menos).';
  } else if (antiguedadVehiculo > LIMITES.antiguedadVehiculoMuyAltaAnios) {
    pieMinimoSugeridoPct = LIMITES.pieMinUsadoMuyAntiguoPct;
    plazoMaxSugerido = LIMITES.plazoMaxUsadoMuyAntiguo;
    nivelAcceso = 'muy_exigente';
    resumenPerfil = 'Usado muy antiguo: suele pedirse ~50% de pie y plazos cortos.';
  } else if (antiguedadVehiculo > LIMITES.antiguedadVehiculoAltaAnios) {
    pieMinimoSugeridoPct = LIMITES.pieMinUsadoAntiguoPct;
    plazoMaxSugerido = LIMITES.plazoMaxUsadoAntiguo;
    nivelAcceso = 'exigente';
    resumenPerfil = 'Usado con más de 6 años: pie habitual ~40% y plazo acotado.';
  } else {
    pieMinimoSugeridoPct = LIMITES.pieMinUsadoRecientePct;
    nivelAcceso = 'estandar';
    resumenPerfil = 'Usado reciente: pie habitual ~20%.';
  }

  if (input.tipoTrabajador === 'independiente') {
    pieMinimoSugeridoPct = clampPie(pieMinimoSugeridoPct + 0.1);
    if (nivelAcceso === 'favorable' || nivelAcceso === 'estandar') {
      nivelAcceso = 'exigente';
    }
    resumenPerfil += ' Independiente: bancos suelen reconocer ~60% de la renta.';
  }

  if (input.tieneDicom) {
    pieMinimoSugeridoPct = clampPie(Math.max(pieMinimoSugeridoPct, 0.35) + 0.05);
    nivelAcceso = 'muy_exigente';
    resumenPerfil +=
      ' Antecedentes comerciales: evaluación caso a caso (más pie, aval o rechazo posible).';
  }

  const edad = input.edad ?? 35;
  const mesesPorEdad = Math.max((LIMITES.edadMaxAlTermino - edad) * 12, 0);
  plazoMaxSugerido = Math.min(
    plazoMaxSugerido,
    mesesPorEdad || LIMITES.plazoMinMeses,
  );

  return {
    pieMinimoSugeridoPct,
    plazoMaxSugerido,
    nivelAcceso,
    resumenPerfil,
    antiguedadVehiculo,
  };
}

function calcularTasasAjustadas(input: SimuladorInput, antiguedad: number) {
  const piePct = input.precioVehiculo > 0 ? input.pieMonto / input.precioVehiculo : 0;
  let ajuste = 0;
  if (input.tipoVehiculo === 'usado') {
    if (antiguedad > LIMITES.antiguedadVehiculoMuyAltaAnios) {
      ajuste += AJUSTES.vehiculoUsadoMasDe8Anios;
    } else if (antiguedad > LIMITES.antiguedadVehiculoAltaAnios) {
      ajuste += AJUSTES.vehiculoUsadoEntre4y8Anios + 0.0008;
    } else if (antiguedad >= 4) {
      ajuste += AJUSTES.vehiculoUsadoEntre4y8Anios;
    }
  }
  if (piePct < 0.1) ajuste += AJUSTES.pieMenorA10Porciento;
  else if (piePct < 0.2) ajuste += AJUSTES.pieMenorA20Porciento;
  else if (piePct >= 0.3) ajuste += AJUSTES.pieMayorOIgualA30Porciento;
  if (input.plazoMeses > 48) ajuste += AJUSTES.plazoMayorA48Meses;
  if (input.tipoTrabajador === 'independiente') ajuste += AJUSTES.trabajadorIndependiente;
  if (input.tieneDicom) ajuste += AJUSTES.antecedentesComerciales;

  return {
    preferencial: TASAS.mensual.preferencial,
    promedioMercado: Math.max(
      TASAS.mensual.preferencial,
      TASAS.mensual.promedioMercado + ajuste,
    ),
    conservadora: Math.max(
      TASAS.mensual.promedioMercado,
      TASAS.mensual.conservadora + ajuste,
    ),
  };
}

function construirEscenario(
  nivel: NivelEscenario,
  etiqueta: string,
  tasaMensual: number,
  monto: number,
  plazoMeses: number,
  edad: number,
): EscenarioResultado {
  const cuotaCredito = cuotaFrancesa(monto, tasaMensual, plazoMeses);
  const seguroDesgravamenMensual =
    monto * COSTOS_ASOCIADOS.seguroDesgravamenMensualPct * factorDesgravamen(edad);
  const seguroCesantiaMensual = monto * COSTOS_ASOCIADOS.seguroCesantiaMensualPct;
  const cuotaTotalMensual = cuotaCredito + seguroDesgravamenMensual + seguroCesantiaMensual;
  const gastosOperacionales = COSTOS_ASOCIADOS.gastosOperacionalesCLP;
  const impuestoTimbres = Math.min(
    monto * COSTOS_ASOCIADOS.impuestoTimbresPctMensual * plazoMeses,
    monto * COSTOS_ASOCIADOS.impuestoTimbresTope,
  );
  const costoTotalCredito =
    cuotaTotalMensual * plazoMeses + gastosOperacionales + impuestoTimbres;
  const tasaAnualAprox = Math.pow(1 + tasaMensual, 12) - 1;
  const plazoAnios = plazoMeses / 12;
  const costoAnualizadoExtra =
    monto > 0
      ? ((seguroDesgravamenMensual + seguroCesantiaMensual) * 12 +
          (gastosOperacionales + impuestoTimbres) / Math.max(plazoAnios, 1)) /
        monto
      : 0;

  return {
    nivel,
    etiqueta,
    tasaMensual,
    tasaAnualAprox,
    cuotaCredito,
    seguroDesgravamenMensual,
    seguroCesantiaMensual,
    cuotaTotalMensual,
    gastosOperacionales,
    impuestoTimbres,
    costoTotalCredito,
    caeReferencial: tasaAnualAprox + costoAnualizadoExtra,
  };
}

export function simular(input: SimuladorInput): ResultadoSimulacion {
  const edad = Math.min(Math.max(input.edad || 35, 18), 90);
  const perfil = estimarPieYPlazoSugeridos({
    tipoVehiculo: input.tipoVehiculo,
    anioVehiculo: input.anioVehiculo,
    tipoTrabajador: input.tipoTrabajador,
    tieneDicom: input.tieneDicom,
    edad,
  });

  const pieMonto = Math.min(Math.max(input.pieMonto, 0), input.precioVehiculo);
  const montoAFinanciar = Math.max(input.precioVehiculo - pieMonto, 0);
  const pieEfectivoPct =
    input.precioVehiculo > 0 ? pieMonto / input.precioVehiculo : 0;
  const rentaReconocida = rentaReconocidaDe(input);

  const tasas = calcularTasasAjustadas(input, perfil.antiguedadVehiculo);
  let plazoMeses = Math.min(
    Math.max(input.plazoMeses, LIMITES.plazoMinMeses),
    LIMITES.plazoMaxMeses,
  );
  plazoMeses = Math.min(plazoMeses, Math.max(perfil.plazoMaxSugerido, LIMITES.plazoMinMeses));

  const escenarios: EscenarioResultado[] = [
    construirEscenario(
      'preferencial',
      'Preferencial',
      tasas.preferencial,
      montoAFinanciar,
      plazoMeses,
      edad,
    ),
    construirEscenario(
      'promedioMercado',
      'Mercado',
      tasas.promedioMercado,
      montoAFinanciar,
      plazoMeses,
      edad,
    ),
    construirEscenario(
      'conservadora',
      'Conservador',
      tasas.conservadora,
      montoAFinanciar,
      plazoMeses,
      edad,
    ),
  ];

  const tieneMonto = input.precioVehiculo > 0;
  const cuotaReferencia = escenarios[1].cuotaTotalMensual;
  const totalCompromisoMensual = cuotaReferencia + input.otrasDeudasMensuales;
  const porcentajeSobreRenta =
    rentaReconocida > 0 ? totalCompromisoMensual / rentaReconocida : 0;

  let nivelCarga: NivelRiesgoCarga = 'comoda';
  if (rentaReconocida > 0 && porcentajeSobreRenta > LIMITES.cargaFinancieraAjustada) {
    nivelCarga = 'alta';
  } else if (rentaReconocida > 0 && porcentajeSobreRenta > LIMITES.cargaFinancieraComoda) {
    nivelCarga = 'ajustada';
  }

  const capacidadMensualDisponible = Math.max(
    rentaReconocida * LIMITES.capacidadMaximaFinanciamiento - input.otrasDeudasMensuales,
    0,
  );
  const tasaRef = tasas.promedioMercado;
  const montoMaximoReferencial =
    tasaRef > 0
      ? (capacidadMensualDisponible * (1 - Math.pow(1 + tasaRef, -plazoMeses))) / tasaRef
      : capacidadMensualDisponible * plazoMeses;

  const advertencias: string[] = [];
  if (tieneMonto && pieEfectivoPct + 0.001 < perfil.pieMinimoSugeridoPct) {
    advertencias.push(
      `Pie bajo el habitual para este perfil (~${(perfil.pieMinimoSugeridoPct * 100).toFixed(0)}%).`,
    );
  }
  if (tieneMonto && input.plazoMeses > perfil.plazoMaxSugerido) {
    advertencias.push(
      `Plazo habitual máx. ${perfil.plazoMaxSugerido} meses para este perfil.`,
    );
  }
  if (tieneMonto && rentaReconocida > 0 && nivelCarga === 'alta') {
    advertencias.push('Cuota sobre 30% de la renta reconocida.');
  }
  if (tieneMonto && input.tieneDicom) {
    advertencias.push(
      'Antecedentes comerciales: sujeto a evaluación (más pie, aval o rechazo posible).',
    );
  }
  if (input.edad > 0 && input.edad < LIMITES.edadMinima) {
    advertencias.push(`Edad mínima habitual: ${LIMITES.edadMinima} años.`);
  }
  if (
    tieneMonto &&
    input.tipoVehiculo === 'usado' &&
    perfil.antiguedadVehiculo > LIMITES.antiguedadVehiculoMuyAltaAnios
  ) {
    advertencias.push('Vehículo muy antiguo: pocas financieras lo toman; conviene validar.');
  }

  return {
    montoAFinanciar,
    pieEfectivoPct,
    antiguedadVehiculo: perfil.antiguedadVehiculo,
    rentaReconocida,
    escenarios,
    cargaFinanciera: { nivel: nivelCarga, porcentajeSobreRenta },
    montoMaximoReferencial,
    pieMinimoSugeridoPct: perfil.pieMinimoSugeridoPct,
    plazoMaxSugerido: perfil.plazoMaxSugerido,
    nivelAcceso: perfil.nivelAcceso,
    resumenPerfil: perfil.resumenPerfil,
    advertencias: advertencias.slice(0, 3),
  };
}
