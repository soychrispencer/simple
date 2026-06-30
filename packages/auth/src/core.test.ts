import { describe, expect, it } from 'vitest';
import { resolveSafeInternalPath } from './core';

describe('resolveSafeInternalPath', () => {
    it('devuelve rutas internas sin cambios', () => {
        expect(resolveSafeInternalPath('/')).toBe('/');
        expect(resolveSafeInternalPath('/panel')).toBe('/panel');
        expect(resolveSafeInternalPath('/panel/publicar?step=2')).toBe('/panel/publicar?step=2');
        expect(resolveSafeInternalPath('/panel#seccion')).toBe('/panel#seccion');
    });

    it('usa el fallback con valores vacíos o nulos', () => {
        expect(resolveSafeInternalPath('')).toBe('/');
        expect(resolveSafeInternalPath(null)).toBe('/');
        expect(resolveSafeInternalPath(undefined)).toBe('/');
        expect(resolveSafeInternalPath(null, '/panel')).toBe('/panel');
    });

    it('bloquea URLs externas absolutas', () => {
        expect(resolveSafeInternalPath('https://evil.com')).toBe('/');
        expect(resolveSafeInternalPath('http://evil.com/path')).toBe('/');
        expect(resolveSafeInternalPath('evil.com')).toBe('/');
    });

    it('bloquea redirecciones abiertas protocol-relative', () => {
        expect(resolveSafeInternalPath('//evil.com')).toBe('/');
        expect(resolveSafeInternalPath('//evil.com/login')).toBe('/');
    });

    it('bloquea variantes con backslash que el navegador normaliza a //', () => {
        expect(resolveSafeInternalPath('/\\evil.com')).toBe('/');
        expect(resolveSafeInternalPath('\\\\evil.com')).toBe('/');
        expect(resolveSafeInternalPath('\\/evil.com')).toBe('/');
    });

    it('bloquea contrabando con espacios y caracteres de control', () => {
        expect(resolveSafeInternalPath('/\t/evil.com')).toBe('/');
        expect(resolveSafeInternalPath('/\n/evil.com')).toBe('/');
        expect(resolveSafeInternalPath(' //evil.com')).toBe('/');
        expect(resolveSafeInternalPath('/ /evil.com')).toBe('/');
    });

    it('respeta el fallback personalizado al rechazar', () => {
        expect(resolveSafeInternalPath('https://evil.com', '/panel')).toBe('/panel');
        expect(resolveSafeInternalPath('//evil.com', '/inicio')).toBe('/inicio');
    });
});
