import { describe, expect, it } from 'vitest';
import { formatCLP, formatPct, simular } from './calculadora';

describe('simular crédito automotriz', () => {
    it('calcula cuota francesa y monto a financiar', () => {
        const resultado = simular({
            precioVehiculo: 12_500_000,
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 4,
            pieMonto: 2_500_000,
            plazoMeses: 48,
            rentaLiquida: 900_000,
            tipoTrabajador: 'dependiente',
            otrasDeudasMensuales: 0,
        });

        expect(resultado.montoAFinanciar).toBe(10_000_000);
        expect(resultado.pieEfectivoPct).toBeCloseTo(0.2, 5);
        expect(resultado.escenarios).toHaveLength(3);
        expect(resultado.escenarios[0].cuotaTotalMensual).toBeGreaterThan(0);
        expect(resultado.escenarios[1].cuotaTotalMensual).toBeGreaterThan(
            resultado.escenarios[0].cuotaTotalMensual,
        );
        expect(resultado.escenarios[2].cuotaTotalMensual).toBeGreaterThan(
            resultado.escenarios[1].cuotaTotalMensual,
        );
    });

    it('marca pie bajo el mínimo sugerido en usados recientes', () => {
        const resultado = simular({
            precioVehiculo: 10_000_000,
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 3,
            pieMonto: 500_000,
            plazoMeses: 36,
            rentaLiquida: 800_000,
            tipoTrabajador: 'dependiente',
            otrasDeudasMensuales: 0,
        });

        expect(resultado.pieMinimoSugeridoPct).toBe(0.2);
        expect(resultado.advertencias.some((a) => a.includes('pie'))).toBe(true);
    });

    it('marca carga financiera alta sobre 30% de la renta', () => {
        const resultado = simular({
            precioVehiculo: 20_000_000,
            tipoVehiculo: 'nuevo',
            anioVehiculo: new Date().getFullYear(),
            pieMonto: 2_000_000,
            plazoMeses: 60,
            rentaLiquida: 350_000,
            tipoTrabajador: 'dependiente',
            otrasDeudasMensuales: 100_000,
        });

        expect(resultado.cargaFinanciera.nivel).toBe('alta');
        expect(resultado.cargaFinanciera.porcentajeSobreRenta).toBeGreaterThan(0.3);
    });

    it('limita plazo sugerido en usados antiguos', () => {
        const resultado = simular({
            precioVehiculo: 8_000_000,
            tipoVehiculo: 'usado',
            anioVehiculo: new Date().getFullYear() - 10,
            pieMonto: 2_400_000,
            plazoMeses: 48,
            rentaLiquida: 900_000,
            tipoTrabajador: 'dependiente',
            otrasDeudasMensuales: 0,
        });

        expect(resultado.plazoMaxSugerido).toBe(36);
        expect(resultado.pieMinimoSugeridoPct).toBe(0.3);
        expect(resultado.advertencias.some((a) => a.includes('plazo'))).toBe(true);
    });

    it('formatea CLP y porcentajes', () => {
        expect(formatCLP(1_250_000)).toMatch(/1\.250\.000/);
        expect(formatPct(0.125, 1)).toBe('12.5%');
    });
});
