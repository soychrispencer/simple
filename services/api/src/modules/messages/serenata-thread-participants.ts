import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataClients, serenataOwners, serenataProviderGroups } from '../../db/schema.js';

export type SerenataThreadParticipants = {
    ownerUserId: string;
    buyerUserId: string;
};

export async function resolveSerenataMessageParticipants(serenata: {
    ownerId: string | null;
    clientId: string | null;
    providerGroupId: string | null;
}): Promise<SerenataThreadParticipants | null> {
    let buyerUserId: string | null = null;
    if (serenata.clientId) {
        const client = await db.query.serenataClients.findFirst({
            where: eq(serenataClients.id, serenata.clientId),
            columns: { userId: true },
        });
        buyerUserId = client?.userId ?? null;
    }
    if (!buyerUserId) return null;

    let ownerUserId: string | null = null;
    if (serenata.providerGroupId) {
        const group = await db.query.serenataProviderGroups.findFirst({
            where: eq(serenataProviderGroups.id, serenata.providerGroupId),
            columns: { ownerUserId: true },
        });
        ownerUserId = group?.ownerUserId ?? null;
    } else if (serenata.ownerId) {
        const owner = await db.query.serenataOwners.findFirst({
            where: eq(serenataOwners.id, serenata.ownerId),
            columns: { userId: true },
        });
        ownerUserId = owner?.userId ?? null;
    }

    if (!ownerUserId || ownerUserId === buyerUserId) return null;
    return { ownerUserId, buyerUserId };
}
