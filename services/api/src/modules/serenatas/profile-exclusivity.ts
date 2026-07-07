import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataClients, serenataMusicians, serenataOwners } from '../../db/schema.js';

export type SerenataProfileKind = 'client' | 'musician' | 'owner';

export async function removeSerenataProfilesExcept(userId: string, keep: SerenataProfileKind): Promise<void> {
    if (keep !== 'client') {
        await db.delete(serenataClients).where(eq(serenataClients.userId, userId));
    }
    if (keep !== 'musician') {
        await db.delete(serenataMusicians).where(eq(serenataMusicians.userId, userId));
    }
    if (keep !== 'owner') {
        await db.delete(serenataOwners).where(eq(serenataOwners.userId, userId));
    }
}

/** Limpia cuentas legacy con más de un perfil (prioridad: dueño → músico → cliente). */
export async function reconcileExclusiveSerenataProfiles(userId: string): Promise<SerenataProfileKind | null> {
    const [client, musician, owner] = await Promise.all([
        db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, userId), columns: { id: true } }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId), columns: { id: true } }),
        db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId), columns: { id: true } }),
    ]);

    const present: SerenataProfileKind[] = [];
    if (owner) present.push('owner');
    if (musician) present.push('musician');
    if (client) present.push('client');

    if (present.length <= 1) return present[0] ?? null;

    const keep: SerenataProfileKind = owner ? 'owner' : musician ? 'musician' : 'client';
    await removeSerenataProfilesExcept(userId, keep);
    console.warn(`[serenatas] Perfiles duplicados reconciliados para user ${userId}; conservado: ${keep}`);
    return keep;
}

export type ProfileExclusivityFailure = { ok: false; error: string; status: 403 };
export type ProfileExclusivitySuccess = { ok: true };
export type ProfileExclusivityResult = ProfileExclusivitySuccess | ProfileExclusivityFailure;

/** Una cuenta = un perfil Serenatas. Dueño reemplaza otros; músico no convive con dueño. */
export async function assertCanActivateSerenataProfile(
    userId: string,
    kind: SerenataProfileKind,
): Promise<ProfileExclusivityResult> {
    const [client, musician, owner] = await Promise.all([
        db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, userId), columns: { id: true } }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId), columns: { id: true } }),
        db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId), columns: { id: true } }),
    ]);

    if (kind === 'client') {
        if (musician || owner) {
            return {
                ok: false,
                error: 'Esta cuenta ya tiene perfil de operación. No puede ser cliente.',
                status: 403,
            };
        }
        return { ok: true };
    }

    if (kind === 'musician') {
        if (owner) {
            return {
                ok: false,
                error: 'Esta cuenta es de dueño. Cambia el tipo de perfil desde soporte si necesitas ser músico.',
                status: 403,
            };
        }
        if (client) {
            await db.delete(serenataClients).where(eq(serenataClients.userId, userId));
        }
        return { ok: true };
    }

    if (musician || client) {
        await removeSerenataProfilesExcept(userId, 'owner');
    }
    return { ok: true };
}
