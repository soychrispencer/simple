import { describe, expect, it } from 'vitest';
import { estimarPieYPlazoSugeridos, formatCLP, formatPct, simular } from './calculadora';

const base = {
    precioVehiculo: 12_500_000,
    tipoVehiculo: 'usado' as const,
    anioVehiculo: new Date().getFullYear() - 4,
    pieMonto: 2_500_000,
    plazoMeses: 48,
    rentaLiquida: 900_000,
    tipoTrabajador: 'dependiente' as const,
    otrasDeudasMensuales: 0,
    edad: 35,
    tieneDicom: false,
};

describe('simular crédito automotriz', () => {
    it('calcula cuota con seguros desglosados', () => {
        const resultado = simular(base);
        expect(resultado.montoAFinanciar).toBe(10_000_000);
        expect(resultado.escenarios[1].seguroDesgravamenMensual).toBeGreaterThan(0);
        expect(resultado.escenarios[1].seguroCesantiaMensual).toBeGreaterThan(0);
        expect(resultado.escenarios[1].cuotaTotalMensual).toBeGreaterThan(
            resultado.escenarios[1].cuotaCredito,
        );
    });

    it('reduce renta reconocida para independientes', () => {
        const dep = simular(base);
        const indep = simular({ ...base, tipoTrabajador: 'independiente' });
        expect(indep.rentaReconocida).toBeLessThan(dep.rentaReconocida);
        expect(indep.montoMaximoReferencial).toBeLessThan(dep.montoMaximoReferencial);
    });

    it('sugiere ~20% en usado reciente y ~40% en usado antiguo', () => {
        const reciente = estimarPieYPlazoSugeridos({
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 3,
        });
        const antiguo = estimarPieYPlazoSugeridos({
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 8,
        });
        expect(reciente.pieMinimoSugeridoPct).toBeCloseTo(0.2, 2);
        expect(antiguo.pieMinimoSugeridoPct).toBeCloseTo(0.4, 2);
        expect(antiguo.plazoMaxSugerido).toBeLessThanOrEqual(36);
    });

    it('eleva pie ante antecedentes comerciales sin marcar rechazo absoluto', () => {
        const sin = estimarPieYPlazoSugeridos({
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 3,
            tieneDicom: false,
        });
        const con = estimarPieYPlazoSugeridos({
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 3,
            tieneDicom: true,
        });
        expect(con.pieMinimoSugeridoPct).toBeGreaterThan(sin.pieMinimoSugeridoPct);
        expect(con.nivelAcceso).toBe('muy_exigente');
        expect(con.resumenPerfil.toLowerCase()).toMatch(/caso a caso|evaluación/);
    });

    it('limita advertencias a 3', () => {
        const resultado = simular({
            ...base,
            pieMonto: 100_000,
            rentaLiquida: 300_000,
            tieneDicom: true,
            edad: 70,
            plazoMeses: 60,
            anioVehiculo: new Date().getFullYear() - 12,
        });
        expect(resultado.advertencias.length).toBeLessThanOrEqual(3);
    });

    it('formatea CLP y porcentajes', () => {
        expect(formatCLP(1_250_000)).toMatch(/1\.250\.000/);
        expect(formatPct(0.125, 1)).toBe('12.5%');
    });
});
