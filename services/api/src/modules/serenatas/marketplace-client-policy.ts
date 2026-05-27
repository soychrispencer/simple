import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataMusicians, serenataOwners } from '../../db/schema.js';

export type MarketplaceClientPolicyFailure = {
    ok: false;
    error: string;
    status: 403;
};

export type MarketplaceClientPolicySuccess = { ok: true };

export type MarketplaceClientPolicyResult = MarketplaceClientPolicySuccess | MarketplaceClientPolicyFailure;

type ProviderGroupOwnership = {
    ownerUserId: string | null;
    ownerId: string | null;
};

export async function validateMarketplaceClientRequest(
    userId: string,
    group?: ProviderGroupOwnership | null,
): Promise<MarketplaceClientPolicyResult> {
    const [ownerProfile, musicianProfile] = await Promise.all([
        db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId) }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId) }),
    ]);

    if (ownerProfile) {
        return {
            ok: false,
            error: 'Las cuentas de dueño no pueden solicitar serenatas por el marketplace. Usa serenatas propias en Agenda.',
            status: 403,
        };
    }

    if (musicianProfile) {
        return {
            ok: false,
            error: 'Las cuentas de músico no pueden solicitar serenatas por el marketplace.',
            status: 403,
        };
    }

    if (group?.ownerUserId === userId) {
        return {
            ok: false,
            error: 'No puedes solicitar serenatas de tu propio mariachi.',
            status: 403,
        };
    }

    return { ok: true };
}

/** Impide perfiles cliente en cuentas de operación (sin cuentas duales). */
export async function assertNoWorkProfileForClientAccount(userId: string): Promise<MarketplaceClientPolicyResult> {
    return validateMarketplaceClientRequest(userId);
}
