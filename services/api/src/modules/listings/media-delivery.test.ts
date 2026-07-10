import { describe, expect, it } from 'vitest';
import { rewriteLegacyBackblazeUrl, toDeliveredMediaUrl } from './media-delivery.js';

describe('rewriteLegacyBackblazeUrl', () => {
    it('reescribe B2 al public URL de R2', () => {
        process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
        process.env.CLOUDFLARE_R2_BUCKET_NAME = 'simple-media';
        expect(
            rewriteLegacyBackblazeUrl(
                'https://f005.backblazeb2.com/file/simple-media/abc/photo.webp',
            ),
        ).toBe('https://pub-4809688bad1a41768578b221b0df942c.r2.dev/abc/photo.webp');
    });

    it('deja URLs R2 intactas', () => {
        const r2 = 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev/abc/photo.webp';
        expect(rewriteLegacyBackblazeUrl(r2)).toBe(r2);
    });
});

describe('toDeliveredMediaUrl', () => {
    it('nunca entrega hosts backblazeb2.com', () => {
        process.env.CLOUDFLARE_R2_PUBLIC_URL = 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
        process.env.CLOUDFLARE_R2_BUCKET_NAME = 'simple-media';
        const out = toDeliveredMediaUrl(
            'https://f005.backblazeb2.com/file/simple-media/x/y.webp',
        );
        expect(out).not.toMatch(/backblazeb2/i);
        expect(out).toContain('r2.dev/x/y.webp');
    });
});
