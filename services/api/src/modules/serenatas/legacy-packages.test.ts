import { afterEach, describe, expect, it } from 'vitest';
import { legacySerenataPackagesEnabled } from './router.js';

describe('legacySerenataPackagesEnabled', () => {
    afterEach(() => {
        delete process.env.SERENATAS_LEGACY_PACKAGES;
    });

    it('bloquea paquetes legacy por defecto', () => {
        expect(legacySerenataPackagesEnabled()).toBe(false);
    });

    it('habilita legacy cuando SERENATAS_LEGACY_PACKAGES=true', () => {
        process.env.SERENATAS_LEGACY_PACKAGES = 'true';
        expect(legacySerenataPackagesEnabled()).toBe(true);
    });
});
