import { describe, expect, it } from 'vitest';
import { attachGeneratedVideoToListing, createListingReelTitleCard } from './generate-listing-reel.js';

describe('generate-listing-reel', () => {
    it('crea portada con título y precio', async () => {
        const buffer = await createListingReelTitleCard('Toyota Corolla 2020', '$12.990.000');
        expect(buffer.byteLength).toBeGreaterThan(1000);
    });

    it('adjunta video generado al listing', () => {
        const updated = attachGeneratedVideoToListing({
            rawData: { media: { photos: [] } },
            videoUrl: null,
        }, 'https://cdn.example/reel.mp4', 2048);

        expect(updated.videoUrl).toBe('https://cdn.example/reel.mp4');
        const rawData = updated.rawData as unknown as { media: { videoUrl: string; discoverVideo: { generated: boolean } } };
        expect(rawData.media.videoUrl).toBe('https://cdn.example/reel.mp4');
        expect(rawData.media.discoverVideo.generated).toBe(true);
    });
});
