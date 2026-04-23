import { Hono } from 'hono';
import type { Context } from 'hono';

export interface SocialRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    db: any;
    tables: { savedListings: any };
    dbHelpers: { eq: any; and: any };
    savedRecordSchema: any;
    followToggleSchema: any;
    getSavedListingsByUser: (userId: string) => Promise<any[]>;
    savedByUser: Map<string, any[]>;
    getListingById: (id: string) => Promise<any>;
    getFollowSetByVertical: (userId: string, vertical: any) => Set<string>;
    getFollowRecords: (userId: string) => any[];
    followsByUser: Map<string, any[]>;
    countFollowers: (userId: string, vertical: any) => number;
    usersById: Map<string, any>;
    buildSocialFeedClips: (vertical: any, section: string | undefined) => any[];
    getPublishedSellerProfile: (userId: string, vertical: any) => any;
    usernameFromName: (name: string) => string;
    formatAgo: (ts: number) => string;
}

export function createSocialRouter(deps: SocialRouterDeps) {
    const {
        authUser,
        parseVertical,
        db,
        tables: { savedListings },
        dbHelpers: { eq, and },
        savedRecordSchema,
        followToggleSchema,
        getSavedListingsByUser,
        savedByUser,
        getListingById,
        getFollowSetByVertical,
        getFollowRecords,
        followsByUser,
        countFollowers,
        usersById,
        buildSocialFeedClips,
        getPublishedSellerProfile,
        usernameFromName,
        formatAgo,
    } = deps;

    const app = new Hono();

    app.get('/saved', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const items = await getSavedListingsByUser(user.id);
        savedByUser.set(user.id, items);
        return c.json({ ok: true, items });
    });

    app.post('/saved/toggle', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = savedRecordSchema.safeParse(payload);

        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const listingId = parsed.data.id;
        const targetListing = await getListingById(listingId);
        if (!targetListing) {
            return c.json({ ok: false, error: 'La publicación no existe.' }, 404);
        }

        const existing = await db
            .select()
            .from(savedListings)
            .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)))
            .limit(1);

        let saved = false;
        if (existing.length > 0) {
            await db
                .delete(savedListings)
                .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)));
        } else {
            saved = true;
            await db.insert(savedListings).values({
                userId: user.id,
                listingId,
                savedAt: new Date(),
            });
        }

        const items = await getSavedListingsByUser(user.id);
        savedByUser.set(user.id, items);
        return c.json({ ok: true, saved, items });
    });

    app.delete('/saved/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const id = c.req.param('id') ?? '';
        await db
            .delete(savedListings)
            .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, id)));

        const items = await getSavedListingsByUser(user.id);
        savedByUser.set(user.id, items);

        return c.json({ ok: true, items });
    });

    app.get('/social/feed', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const section = c.req.query('section');
        const user = await authUser(c);
        const followSet = user ? getFollowSetByVertical(user.id, vertical) : new Set<string>();

        const items = buildSocialFeedClips(vertical, section)
            .sort((a: any, b: any) => {
                const aFollowed = followSet.has(a.authorId) ? 1 : 0;
                const bFollowed = followSet.has(b.authorId) ? 1 : 0;
                if (aFollowed !== bFollowed) return bFollowed - aFollowed;
                if (Boolean(a.featured) !== Boolean(b.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
                return b.publishedAt - a.publishedAt;
            })
            .map((clip: any) => {
                const author = usersById.get(clip.authorId);
                const authorProfile = author ? getPublishedSellerProfile(author.id, vertical) : null;
                const authorName = authorProfile?.displayName ?? author?.name ?? 'Cuenta verificada';
                const authorUsername = authorProfile?.slug ?? usernameFromName(authorName);
                return {
                    id: clip.id,
                    vertical: clip.vertical,
                    section: clip.section,
                    href: clip.href,
                    title: clip.title,
                    price: clip.price,
                    location: clip.location,
                    mediaType: clip.mediaType,
                    mediaUrl: clip.mediaUrl,
                    posterUrl: clip.posterUrl,
                    views: clip.views,
                    saves: clip.saves,
                    publishedAgo: formatAgo(clip.publishedAt),
                    featured: Boolean(clip.featured),
                    author: {
                        id: clip.authorId,
                        name: authorName,
                        username: authorUsername,
                        profileHref: authorProfile ? `/perfil/${authorUsername}` : null,
                        avatar: authorProfile?.avatarImageUrl ?? author?.avatar,
                        followers: countFollowers(clip.authorId, vertical),
                        isFollowing: followSet.has(clip.authorId),
                        canFollow: user ? user.id !== clip.authorId : true,
                    },
                };
            });

        return c.json({ ok: true, clips: items });
    });

    app.get('/social/follows', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const followees = Array.from(getFollowSetByVertical(user.id, vertical));
        return c.json({ ok: true, followees });
    });

    app.post('/social/follows/toggle', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = followToggleSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const { followeeUserId, vertical } = parsed.data;
        if (!usersById.has(followeeUserId)) {
            return c.json({ ok: false, error: 'Cuenta no encontrada' }, 404);
        }
        if (followeeUserId === user.id) {
            return c.json({ ok: false, error: 'No puedes seguirte a ti mismo' }, 400);
        }

        const existing = getFollowRecords(user.id);
        const index = existing.findIndex((entry: any) => entry.followeeUserId === followeeUserId && entry.vertical === vertical);

        let following = false;
        let updated: any[];

        if (index >= 0) {
            updated = existing.filter((_: any, idx: number) => idx !== index);
        } else {
            following = true;
            updated = [{ followeeUserId, vertical, followedAt: Date.now() }, ...existing];
        }

        followsByUser.set(user.id, updated);

        return c.json({
            ok: true,
            following,
            followees: Array.from(getFollowSetByVertical(user.id, vertical)),
            followers: countFollowers(followeeUserId, vertical),
        });
    });

    return app;
}
