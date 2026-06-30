import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataGroupMembers, serenataMusicianPayouts, serenatas } from '../../db/schema.js';

export type MusicianPayoutStatus = 'pending' | 'paid';

export function mapMusicianPayout(row: typeof serenataMusicianPayouts.$inferSelect) {
    return {
        id: row.id,
        serenataId: row.serenataId,
        musicianId: row.musicianId,
        musicianName: row.musicianName,
        amount: row.amount,
        status: row.status as MusicianPayoutStatus,
        paymentMethod: row.paymentMethod,
        paidAt: row.paidAt?.toISOString() ?? null,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export async function listSerenataMusicianPayouts(serenataId: string, ownerId: string) {
    const rows = await db
        .select()
        .from(serenataMusicianPayouts)
        .where(and(
            eq(serenataMusicianPayouts.serenataId, serenataId),
            eq(serenataMusicianPayouts.ownerId, ownerId),
        ))
        .orderBy(asc(serenataMusicianPayouts.createdAt));
    return rows.map(mapMusicianPayout);
}

export async function listOwnerMusicianPayouts(ownerId: string, status?: MusicianPayoutStatus) {
    const conditions = [eq(serenataMusicianPayouts.ownerId, ownerId)];
    if (status) conditions.push(eq(serenataMusicianPayouts.status, status));
    const rows = await db
        .select({
            payout: serenataMusicianPayouts,
            recipientName: serenatas.recipientName,
            eventDate: serenatas.eventDate,
            eventTime: serenatas.eventTime,
            serenataPrice: serenatas.price,
        })
        .from(serenataMusicianPayouts)
        .innerJoin(serenatas, eq(serenatas.id, serenataMusicianPayouts.serenataId))
        .where(and(...conditions))
        .orderBy(desc(serenatas.eventDate), asc(serenataMusicianPayouts.musicianName));
    return rows.map((row) => ({
        ...mapMusicianPayout(row.payout),
        recipientName: row.recipientName,
        eventDate: row.eventDate.toISOString(),
        eventTime: row.eventTime,
        serenataPrice: row.serenataPrice,
    }));
}

export async function listMusicianPayouts(musicianId: string, status?: MusicianPayoutStatus) {
    const conditions = [eq(serenataMusicianPayouts.musicianId, musicianId)];
    if (status) conditions.push(eq(serenataMusicianPayouts.status, status));
    const rows = await db
        .select({
            payout: serenataMusicianPayouts,
            recipientName: serenatas.recipientName,
            eventDate: serenatas.eventDate,
            eventTime: serenatas.eventTime,
            serenataPrice: serenatas.price,
        })
        .from(serenataMusicianPayouts)
        .innerJoin(serenatas, eq(serenatas.id, serenataMusicianPayouts.serenataId))
        .leftJoin(
            serenataGroupMembers,
            and(
                eq(serenataGroupMembers.groupId, serenatas.groupId),
                eq(serenataGroupMembers.musicianId, musicianId),
            ),
        )
        .where(and(...conditions))
        .orderBy(desc(serenatas.eventDate), asc(serenataMusicianPayouts.musicianName));
    return rows.map((row) => ({
        ...mapMusicianPayout(row.payout),
        recipientName: row.recipientName,
        eventDate: row.eventDate.toISOString(),
        eventTime: row.eventTime,
        serenataPrice: row.serenataPrice,
    }));
}

export type MusicianPayoutLineInput = {
    musicianId?: string | null;
    musicianName?: string | null;
    amount: number;
    status?: MusicianPayoutStatus;
    paymentMethod?: string | null;
    notes?: string | null;
};

export async function replaceSerenataMusicianPayouts(
    ownerId: string,
    serenataId: string,
    lines: MusicianPayoutLineInput[],
) {
    const serenata = await db.query.serenatas.findFirst({
        where: and(eq(serenatas.id, serenataId), eq(serenatas.ownerId, ownerId)),
    });
    if (!serenata) return { ok: false as const, error: 'Serenata no encontrada', status: 404 };

    const sanitized = lines
        .filter((line) => line.amount > 0 && (line.musicianId || line.musicianName?.trim()))
        .map((line) => ({
            serenataId,
            ownerId,
            musicianId: line.musicianId ?? null,
            musicianName: line.musicianName?.trim() || null,
            amount: Math.round(line.amount),
            status: line.status ?? 'pending',
            paymentMethod: line.paymentMethod?.trim() || null,
            paidAt: line.status === 'paid' ? new Date() : null,
            notes: line.notes?.trim() || null,
            updatedAt: new Date(),
        }));

    return db.transaction(async (tx) => {
        await tx.delete(serenataMusicianPayouts).where(and(
            eq(serenataMusicianPayouts.serenataId, serenataId),
            eq(serenataMusicianPayouts.ownerId, ownerId),
        ));
        if (sanitized.length === 0) {
            return { ok: true as const, items: [] as ReturnType<typeof mapMusicianPayout>[] };
        }
        const inserted = await tx.insert(serenataMusicianPayouts).values(sanitized).returning();
        return { ok: true as const, items: inserted.map(mapMusicianPayout) };
    });
}
