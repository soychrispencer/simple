import { describe, expect, it } from 'vitest';
import { resolveActiveNavHref } from './resolve-active-nav';

const items = [
    { href: '/panel' },
    { href: '/panel/solicitudes' },
    { href: '/panel/agenda' },
    { href: '/panel/mi-negocio' },
    { href: '/panel/mi-negocio?tab=grupos' },
] as const;

describe('resolveActiveNavHref', () => {
    it('activa Mi panel solo en /panel', () => {
        expect(resolveActiveNavHref('/panel', items)).toBe('/panel');
        expect(resolveActiveNavHref('/panel/', items)).toBe('/panel');
    });

    it('no marca Mi panel en rutas hijas', () => {
        expect(resolveActiveNavHref('/panel/solicitudes', items)).toBe('/panel/solicitudes');
        expect(resolveActiveNavHref('/panel/agenda', items)).toBe('/panel/agenda');
    });

    it('prefiere el href más específico', () => {
        expect(resolveActiveNavHref('/panel/mi-negocio', items)).toBe('/panel/mi-negocio');
        expect(resolveActiveNavHref('/panel/mi-negocio?tab=grupos', items)).toBe('/panel/mi-negocio');
    });
});
