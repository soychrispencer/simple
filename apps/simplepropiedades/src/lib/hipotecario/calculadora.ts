import { anualATasaMensual, cuotaFrancesa, type NivelRiesgoCarga } from '@simple/simulador-ui';
import {
  AJUSTES_ANUALES,
  COSTOS_ASOCIADOS,
  FACTOR_DESGRAVAMEN_EDAD,
  LIMITES,
  TASAS_ANUALES,
} from './tasas-referenciales';

export type TipoPropiedad = 'nueva' | 'usada';
export type TipoVivienda = 'primera' | 'segunda';
export type TipoTrabajador = 'dependiente' | 'independiente';
export type NivelEscenario = 'preferencial' | 'promedioMercado' | 'conservadora';

export interface SimuladorHipotecarioInput {
  valorPropiedad: number;
  tipoPropiedad: TipoPropiedad;
  tipoVivienda: TipoVivienda;
  financiamientoPct: number;
  plazoAnios: number;
  rentaLiquida: number;
  tipoTrabajador: TipoTrabajador;
  otrasDeudasMensuales: number;
  valorUF: number;
  edad: number;
  tieneDicom: boolean;
}

export interface EscenarioResultado {
  nivel: NivelEscenario;
  etiqueta: string;
  tasaAnual: number;
  tasaMensual: number;
  dividendoCredito: number;
  dividendoUF: number;
  seguroDesgravamenMensual: number;
  seguroIncendioSismoMensual: number;
  segurosMensual: number;
  dividendoTotalMensual: number;
  gastosOperacionales: number;
  impuestoMutuo: number;
  costoTotalCredito: number;
  caeReferencial: number;
}

export interface ResultadoSimulacion {
  montoAFinanciar: number;
  pieCLP: number;
  pieEfectivoPct: number;
  rentaReconocida: number;
  financiamientoEfectivoPct: number;
  escenarios: EscenarioResultado[];
  cargaFinanciera: {
    nivel: NivelRiesgoCarga;
    porcentajeSobreRenta: number;
  };
  montoMaximoReferencial: number;
  advertencias: string[];
}

function factorDesgravamen(edad: number): number {
  for (const fila of FACTOR_DESGRAVAMEN_EDAD) {
    if (edad <= fila.hasta) return fila.factor;
  }
  return FACTOR_DESGRAVAMEN_EDAD[FACTOR_DESGRAVAMEN_EDAD.length - 1].factor;
}

function rentaReconocidaDe(input: SimuladorHipotecarioInput): number {
  if (input.tipoTrabajador === 'independiente') {
    return input.rentaLiquida * LIMITES.rentaReconocidaIndependiente;
  }
  return input.rentaLiquida;
}

function calcularTasasAjustadas(input: SimuladorHipotecarioInput) {
  let ajuste = 0;
  if (input.financiamientoPct > LIMITES.financiamientoRecomendadoPct) {
    ajuste += AJUSTES_ANUALES.financiamientoSobre80Porciento;
  }
  if (input.tipoPropiedad === 'usada') ajuste += AJUSTES_ANUALES.viviendaUsada;
  if (input.plazoAnios > 25) ajuste += AJUSTES_ANUALES.plazoMayorA25Anios;
  if (input.tipoTrabajador === 'independiente') {
    ajuste += AJUSTES_ANUALES.trabajadorIndependiente;
  }
  if (input.tipoVivienda === 'segunda') ajuste += AJUSTES_ANUALES.segundaVivienda;
  if (input.tieneDicom) ajuste += 0.003;

  return {
    preferencial: TASAS_ANUALES.preferencial,
    promedioMercado: Math.max(
      TASAS_ANUALES.preferencial,
      TASAS_ANUALES.promedioMercado + ajuste,
    ),
    conservadora: Math.max(
      TASAS_ANUALES.promedioMercado,
      TASAS_ANUALES.conservadora + ajuste,
    ),
  };
}

function construirEscenario(
  nivel: NivelEscenario,
  etiqueta: string,
  tasaAnual: number,
  monto: number,
  plazoMeses: number,
  valorUF: number,
  edad: number,
): EscenarioResultado {
  const tasaMensual = anualATasaMensual(tasaAnual);
  const dividendoCredito = cuotaFrancesa(monto, tasaMensual, plazoMeses);
  const seguroDesgravamenMensual =
    monto * COSTOS_ASOCIADOS.seguroDesgravamenMensualPct * factorDesgravamen(edad);
  const seguroIncendioSismoMensual =
    monto * COSTOS_ASOCIADOS.seguroIncendioSismoMensualPct;
  const segurosMensual = seguroDesgravamenMensual + seguroIncendioSismoMensual;
  const dividendoTotalMensual = dividendoCredito + segurosMensual;
  const gastosOperacionales = monto * COSTOS_ASOCIADOS.gastosOperacionalesPctMonto;
  const impuestoMutuo = monto * COSTOS_ASOCIADOS.impuestoMutuoPct;
  const costoTotalCredito =
    dividendoTotalMensual * plazoMeses + gastosOperacionales + impuestoMutuo;
  const plazoAnios = plazoMeses / 12;
  const costoAnualizadoExtra =
    monto > 0
      ? (segurosMensual * 12 +
          (gastosOperacionales + impuestoMutuo) / Math.max(plazoAnios, 1)) /
        monto
      : 0;

  return {
    nivel,
    etiqueta,
    tasaAnual,
    tasaMensual,
    dividendoCredito,
    dividendoUF: valorUF > 0 ? dividendoCredito / valorUF : 0,
    seguroDesgravamenMensual,
    seguroIncendioSismoMensual,
    segurosMensual,
    dividendoTotalMensual,
    gastosOperacionales,
    impuestoMutuo,
    costoTotalCredito,
    caeReferencial: tasaAnual + costoAnualizadoExtra,
  };
}

export function simular(input: SimuladorHipotecarioInput): ResultadoSimulacion {
  const edad = Math.min(Math.max(input.edad || 35, 18), 90);
  const maxFin =
    input.tipoVivienda === 'segunda'
      ? LIMITES.financiamientoMaxSegundaViviendaPct
      : LIMITES.financiamientoMaxPct;

  const financiamientoPct = Math.min(
    Math.max(input.financiamientoPct, LIMITES.financiamientoMinPct),
    maxFin,
  );
  const montoAFinanciar = input.valorPropiedad * financiamientoPct;
  const pieCLP = input.valorPropiedad - montoAFinanciar;
  const pieEfectivoPct = input.valorPropiedad > 0 ? pieCLP / input.valorPropiedad : 0;

  let plazoAnios = Math.min(
    Math.max(input.plazoAnios, LIMITES.plazoMinAnios),
    LIMITES.plazoMaxAnios,
  );
  const plazoMaxPorEdad = Math.max(LIMITES.edadMaxAlTermino - edad, LIMITES.plazoMinAnios);
  plazoAnios = Math.min(plazoAnios, plazoMaxPorEdad);
  const plazoMeses = plazoAnios * 12;
  const rentaReconocida = rentaReconocidaDe(input);
  const tasas = calcularTasasAjustadas({ ...input, financiamientoPct, plazoAnios });

  const escenarios: EscenarioResultado[] = [
    construirEscenario('preferencial', 'Preferencial', tasas.preferencial, montoAFinanciar, plazoMeses, input.valorUF, edad),
    construirEscenario('promedioMercado', 'Mercado', tasas.promedioMercado, montoAFinanciar, plazoMeses, input.valorUF, edad),
    construirEscenario('conservadora', 'Conservador', tasas.conservadora, montoAFinanciar, plazoMeses, input.valorUF, edad),
  ];

  const tieneMonto = input.valorPropiedad > 0;
  const dividendoReferencia = escenarios[1].dividendoTotalMensual;
  const totalCompromisoMensual = dividendoReferencia + input.otrasDeudasMensuales;
  const porcentajeSobreRenta =
    rentaReconocida > 0 ? totalCompromisoMensual / rentaReconocida : 0;

  let nivelCarga: NivelRiesgoCarga = 'comoda';
  if (rentaReconocida > 0 && porcentajeSobreRenta > LIMITES.dividendoAjustadoPct) {
    nivelCarga = 'alta';
  } else if (rentaReconocida > 0 && porcentajeSobreRenta > LIMITES.dividendoComodoPct) {
    nivelCarga = 'ajustada';
  }

  const capacidadMensualDisponible = Math.max(
    rentaReconocida * LIMITES.capacidadMaximaFinanciamiento -
      input.otrasDeudasMensuales,
    0,
  );
  const tasaMensualRef = anualATasaMensual(tasas.promedioMercado);
  const montoMaximoReferencial =
    tasaMensualRef > 0
      ? (capacidadMensualDisponible *
          (1 - Math.pow(1 + tasaMensualRef, -plazoMeses))) /
        tasaMensualRef
      : capacidadMensualDisponible * plazoMeses;

  const advertencias: string[] = [];
  const pieMin =
    input.tipoVivienda === 'segunda' ? LIMITES.pieMinSegundaViviendaPct : 0.1;
  if (tieneMonto && pieEfectivoPct < pieMin) {
    advertencias.push(`Pie bajo el habitual (~${(pieMin * 100).toFixed(0)}%).`);
  }
  if (tieneMonto && input.tipoVivienda === 'segunda' && input.financiamientoPct > maxFin) {
    advertencias.push('2ª vivienda: financiamiento máx. habitual ~70%.');
  }
  if (tieneMonto && rentaReconocida > 0 && nivelCarga === 'alta') {
    advertencias.push('Dividendo sobre 30% de la renta reconocida.');
  }
  if (tieneMonto && input.tieneDicom) {
    advertencias.push('Con DICOM suele pedirse más pie o condiciones distintas.');
  }
  if (tieneMonto && input.plazoAnios > plazoMaxPorEdad) {
    advertencias.push(`Por edad, plazo máx. habitual ${plazoMaxPorEdad} años.`);
  }

  return {
    montoAFinanciar,
    pieCLP,
    pieEfectivoPct,
    rentaReconocida,
    financiamientoEfectivoPct: financiamientoPct,
    escenarios,
    cargaFinanciera: { nivel: nivelCarga, porcentajeSobreRenta },
    montoMaximoReferencial,
    advertencias: advertencias.slice(0, 2),
  };
}
