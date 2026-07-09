import { describe, expect, it } from 'vitest';
import {
    buildYouTubeShortDescription,
    buildYouTubeShortTitle,
    validateYouTubeShortVideoBuffer,
    youTubeCategoryIdForVertical,
} from './short-validation.js';

describe('validateYouTubeShortVideoBuffer', () => {
    it('rechaza videos mayores a 50 MB', () => {
        const buffer = Buffer.alloc(51 * 1024 * 1024);
        expect(validateYouTubeShortVideoBuffer(buffer).ok).toBe(false);
    });

    it('rechaza videos mas largos que 60 s cuando conoce la duracion', () => {
        const buffer = Buffer.alloc(1024);
        const result = validateYouTubeShortVideoBuffer(buffer, 75);
        expect(result.ok).toBe(false);
    });

    it('acepta videos dentro de limites', () => {
        const buffer = Buffer.alloc(5 * 1024 * 1024);
        expect(validateYouTubeShortVideoBuffer(buffer, 45).ok).toBe(true);
    });
});

describe('buildYouTubeShortTitle', () => {
    it('agrega hashtag Shorts si falta', () => {
        expect(buildYouTubeShortTitle('Toyota Corolla 2020')).toContain('#Shorts');
    });
});

describe('buildYouTubeShortDescription', () => {
    it('agrega hashtag Shorts al final', () => {
        expect(buildYouTubeShortDescription('Venta en Santiago')).toContain('#Shorts');
    });
});

describe('youTubeCategoryIdForVertical', () => {
    it('usa categoria de autos para autos', () => {
        expect(youTubeCategoryIdForVertical('autos')).toBe('2');
    });
});
