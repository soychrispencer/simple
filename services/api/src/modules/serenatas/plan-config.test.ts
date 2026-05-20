import { describe, expect, it } from 'vitest';
import { serenataProMonthlyChargeClp, SERENATA_PRO_PRICE_MONTHLY_CLP } from './plan-config.js';

describe('serenataProMonthlyChargeClp', () => {
    it('incluye IVA 19% sobre el neto mensual', () => {
        expect(serenataProMonthlyChargeClp()).toBe(Math.round(SERENATA_PRO_PRICE_MONTHLY_CLP * 1.19));
    });
});
