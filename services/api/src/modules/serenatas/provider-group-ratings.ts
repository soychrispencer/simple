import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataProviderGroups, serenatas } from '../../db/schema.js';

export type ProviderGroupReviewItem = {
    rating: number;
    confirmedAt: string;
};

export async function recomputeProviderGroupRatings(providerGroupId: string): Promise<void> {
    const [stats] = await db
        .select({
            count: sql<number>`count(*)::int`,
            average: sql<string | null>`round(avg(${serenatas.clientRating})::numeric, 2)`,
        })
        .from(serenatas)
        .where(
            and(
                eq(serenatas.providerGroupId, providerGroupId),
                isNotNull(serenatas.clientRating),
                isNotNull(serenatas.clientConfirmedAt),
                sql`${serenatas.clientRating} between 1 and 5`,
            ),
        );

    const ratingCount = Number(stats?.count ?? 0);
    const ratingAverage = ratingCount > 0 ? String(stats?.average ?? '0') : '0';

    await db
        .update(serenataProviderGroups)
        .set({
            ratingCount,
            ratingAverage,
            updatedAt: new Date(),
        })
        .where(eq(serenataProviderGroups.id, providerGroupId));
}

export async function listProviderGroupReviews(
    providerGroupId: string,
    limit = 12,
): Promise<ProviderGroupReviewItem[]> {
    const rows = await db
        .select({
            rating: serenatas.clientRating,
            confirmedAt: serenatas.clientConfirmedAt,
        })
        .from(serenatas)
        .where(
            and(
                eq(serenatas.providerGroupId, providerGroupId),
                isNotNull(serenatas.clientRating),
                isNotNull(serenatas.clientConfirmedAt),
                sql`${serenatas.clientRating} between 1 and 5`,
            ),
        )
        .orderBy(desc(serenatas.clientConfirmedAt))
        .limit(limit);

    return rows
        .filter((row): row is { rating: number; confirmedAt: Date } => {
            return row.rating != null && row.confirmedAt != null && row.rating >= 1 && row.rating <= 5;
        })
        .map((row) => ({
            rating: row.rating,
            confirmedAt: row.confirmedAt.toISOString(),
        }));
}
