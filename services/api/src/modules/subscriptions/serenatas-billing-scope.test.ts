import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock('../../db/index.js', () => ({ db: mocks }));

import { serenataMusicians, serenataOwners } from '../../db/schema.js';
import { persistUserSubscription } from './persist-db.js';

function selectBuilder(rows: unknown[][]) {
    const take = async () => rows.shift() ?? [];
    return {
        from: () => ({
            where: () => ({
                orderBy: () => ({ limit: take }),
                limit: take,
            }),
        }),
    };
}

describe('SimpleSerenatas individual billing scope', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        { profile: 'provider' as const, table: serenataOwners },
        { profile: 'musician' as const, table: serenataMusicians },
    ])('persists the $profile subscription in the personal account and syncs only its profile', async ({ profile, table }) => {
        const accountId = 'personal-account-1';
        const writtenSubscriptions: Array<Record<string, unknown>> = [];
        const profileUpdates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
        const personalAndPlanRows: unknown[][] = [
            [{ id: accountId }],
            [{ id: `serenatas-${profile}-pro` }],
        ];
        const transactionRows: unknown[][] = [
            [],
            [{ isPersonal: true, ownerUserId: 'user-1' }],
            [],
        ];
        const tx = {
            execute: vi.fn(async () => undefined),
            select: vi.fn(() => selectBuilder(transactionRows)),
            update: vi.fn((targetTable: unknown) => ({
                set: (values: Record<string, unknown>) => {
                    profileUpdates.push({ table: targetTable, values });
                    return { where: async () => undefined };
                },
            })),
            insert: vi.fn(() => ({
                values: (values: Record<string, unknown>) => {
                    writtenSubscriptions.push(values);
                    return { returning: async () => [{ id: 'subscription-1' }] };
                },
            })),
        };

        mocks.select.mockImplementation(() => selectBuilder(personalAndPlanRows));
        mocks.update.mockImplementation(() => ({
            set: () => ({ where: async () => undefined }),
        }));
        mocks.transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

        const result = await persistUserSubscription({
            userId: 'user-1',
            accountId: null,
            vertical: 'serenatas',
            billingProfileType: profile,
            planSlug: 'pro',
            providerSubscriptionId: `mp-${profile}`,
            providerStatus: 'authorized',
            status: 'active',
        });

        expect(result).toEqual({ subscriptionDbId: 'subscription-1', planSlug: 'pro', applied: true });
        expect(writtenSubscriptions).toHaveLength(1);
        expect(writtenSubscriptions[0]).toMatchObject({
            userId: 'user-1',
            accountId,
            billingProfileType: profile,
            vertical: 'serenatas',
            providerSubscriptionId: `mp-${profile}`,
        });
        const billingProfileUpdates = profileUpdates.filter((update) => update.table === table);
        expect(billingProfileUpdates).toHaveLength(1);
        expect(billingProfileUpdates[0].values.commissionRateBps).toBe(0);
        expect(profileUpdates.filter((update) => update.table === serenataOwners)).toHaveLength(profile === 'provider' ? 1 : 0);
        expect(profileUpdates.filter((update) => update.table === serenataMusicians)).toHaveLength(profile === 'musician' ? 1 : 0);
        expect(profile === 'provider' ? billingProfileUpdates[0].values.subscriptionStatus : undefined)
            .toBe(profile === 'provider' ? 'active' : undefined);
    });
});
