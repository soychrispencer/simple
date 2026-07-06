import { describe, expect, it } from 'vitest';
import { evaluateFinancingPrecheck } from './financing-precheck';

describe('evaluateFinancingPrecheck', () => {
    it('bloquea sin ingresos acreditables', () => {
        const result = evaluateFinancingPrecheck({
            vehiclePrice: 10_000_000,
            vehicleYear: 2020,
            vehicleBrand: 'Kia',
            vehicleType: 'particular',
            canProveIncome: false,
            monthlyIncome: 0,
            downPaymentPercent: 20,
            hasDicom: false,
        });
        expect(result.status).toBe('blocked');
    });

    it('exige pie 50% en vehículos de carga', () => {
        const result = evaluateFinancingPrecheck({
            vehiclePrice: 20_000_000,
            vehicleYear: 2020,
            vehicleBrand: 'Hyundai',
            vehicleType: 'carga',
            canProveIncome: true,
            workerType: 'dependent',
            monthlyIncome: 1_200_000,
            downPaymentPercent: 30,
            hasDicom: false,
        });
        expect(result.status).toBe('blocked');
        expect(result.blockers.some((b) => b.includes('50%'))).toBe(true);
    });

    it('marca revisión con DICOM pero no bloquea si cumple lo demás', () => {
        const result = evaluateFinancingPrecheck({
            vehiclePrice: 8_000_000,
            vehicleYear: 2018,
            vehicleBrand: 'Toyota',
            vehicleType: 'particular',
            canProveIncome: true,
            workerType: 'dependent',
            monthlyIncome: 1_500_000,
            downPaymentPercent: 30,
            hasDicom: true,
        });
        expect(result.status).toBe('review');
        expect(result.warnings.some((w) => w.toLowerCase().includes('dicom'))).toBe(true);
    });
});
