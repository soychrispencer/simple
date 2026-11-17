import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMarketplaceSubscriptionEntitlements } from './subscription-entitlements.js';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('marketplace subscription entitlements', () => {
    it('allows a company to add members without a seat cap', () => {
        const entitlements = resolveMarketplaceSubscriptionEntitlements({
            vertical: 'propiedades',
            accountId: 'company-1',
            accountKind: 'company',
            plan: {
                id: 'pro',
                name: 'Profesional',
                maxListings: 50,
                maxImagesPerListing: 20,
                maxFreeBoostsPerMonth: 3,
                analyticsEnabled: true,
                prioritySupport: false,
                customBranding: false,
                apiAccess: false,
            },
            usage: { activeListings: 12, teamMembers: 75 },
            launchMode: false,
        });

        expect(entitlements.limits.teamMembers).toBeNull();
        expect(entitlements.usage.teamMembers).toBe(75);
        expect(entitlements.canAddTeamMember).toBe(true);
        expect(entitlements.teamMemberLimitReason).toBeNull();
    });

    it('keeps a free personal account within the free plan capabilities outside launch mode', () => {
        const entitlements = resolveMarketplaceSubscriptionEntitlements({
            vertical: 'propiedades',
            accountId: 'personal-1',
            accountKind: 'individual',
            plan: {
                id: 'free',
                name: 'Gratuito',
                maxListings: 3,
                maxImagesPerListing: 5,
                maxFreeBoostsPerMonth: 0,
                analyticsEnabled: false,
                prioritySupport: false,
                customBranding: false,
                apiAccess: false,
            },
            usage: { activeListings: 3 },
            launchMode: false,
        });

        expect(entitlements.limits.activeListings).toBe(3);
        expect(entitlements.canCreateActiveListing).toBe(false);
        expect(entitlements.capabilities).toMatchObject({
            publicProfile: false,
            instagramPublishing: false,
            analytics: false,
            apiAccess: false,
        });
    });

    it('keeps the launch access separate from plan and account classification', () => {
        const entitlements = resolveMarketplaceSubscriptionEntitlements({
            vertical: 'propiedades',
            accountId: 'personal-1',
            accountKind: 'individual',
            plan: {
                id: 'free',
                name: 'Gratuito',
                maxListings: 3,
                maxImagesPerListing: 5,
                maxFreeBoostsPerMonth: 0,
                analyticsEnabled: false,
                prioritySupport: false,
                customBranding: false,
                apiAccess: false,
            },
            usage: { activeListings: 10 },
            launchMode: true,
        });

        expect(entitlements.status).toBe('launch');
        expect(entitlements.accountKind).toBe('individual');
        expect(entitlements.limits.activeListings).toBeNull();
        expect(entitlements.canCreateActiveListing).toBe(true);
    });
});
