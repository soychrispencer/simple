import { describe, expect, it, vi } from 'vitest';
import { createSocialHubPublisher } from './publish-hub.js';

describe('createSocialHubPublisher', () => {
    const listing = {
        id: 'listing-1',
        vertical: 'autos' as const,
        status: 'active',
        title: 'Toyota Corolla',
        updatedAt: Date.now(),
    };

    const baseDeps = () => ({
        extractListingVideoUrl: () => 'https://cdn.example/video.mp4',
        publishListingToInstagram: vi.fn()
            .mockResolvedValueOnce({ instagramPermalink: 'https://instagram.com/p/1' })
            .mockResolvedValueOnce({ instagramPermalink: 'https://instagram.com/reel/1' }),
        publishListingToFacebookPage: vi.fn()
            .mockResolvedValue({ permalink: 'https://facebook.com/post/1' }),
        publishListingToTikTok: vi.fn()
            .mockResolvedValue({ permalink: 'https://tiktok.com/@user/video/1' }),
        publishListingToYouTube: vi.fn()
            .mockResolvedValue({ permalink: 'https://youtube.com/shorts/abc' }),
    });

    it('publica en todas las redes disponibles cuando publishAll es true y hay video', async () => {
        const deps = baseDeps();
        const publish = createSocialHubPublisher(deps);

        const results = await publish({ id: 'user-1' }, listing, { publishAll: true });

        expect(results).toHaveLength(5);
        expect(results.filter((item) => item.ok)).toHaveLength(5);
        expect(deps.publishListingToInstagram).toHaveBeenCalledTimes(2);
        expect(deps.publishListingToFacebookPage).toHaveBeenCalledTimes(1);
        expect(deps.publishListingToTikTok).toHaveBeenCalledTimes(1);
        expect(deps.publishListingToYouTube).toHaveBeenCalledTimes(1);
    });

    it('omite reel si el aviso no tiene video', async () => {
        const publishListingToInstagram = vi.fn()
            .mockResolvedValue({ instagramPermalink: 'https://instagram.com/p/1' });
        const publishListingToFacebookPage = vi.fn()
            .mockResolvedValue({ permalink: 'https://facebook.com/post/1' });

        const publish = createSocialHubPublisher({
            extractListingVideoUrl: () => null,
            publishListingToInstagram,
            publishListingToFacebookPage,
            publishListingToTikTok: vi.fn(),
            publishListingToYouTube: vi.fn(),
        });

        const results = await publish({ id: 'user-1' }, listing, {
            targets: ['instagram_reel', 'instagram_carousel', 'tiktok', 'youtube'],
        });

        expect(results).toEqual([
            expect.objectContaining({ target: 'instagram_reel', ok: false }),
            expect.objectContaining({ target: 'instagram_carousel', ok: true }),
            expect.objectContaining({ target: 'tiktok', ok: false }),
            expect.objectContaining({ target: 'youtube', ok: false }),
        ]);
    });

    it('publica en TikTok y YouTube cuando hay video', async () => {
        const deps = baseDeps();
        const publish = createSocialHubPublisher(deps);

        const results = await publish({ id: 'user-1' }, listing, {
            targets: ['tiktok', 'youtube'],
        });

        expect(results).toEqual([
            expect.objectContaining({ target: 'tiktok', ok: true }),
            expect.objectContaining({ target: 'youtube', ok: true }),
        ]);
    });
});
