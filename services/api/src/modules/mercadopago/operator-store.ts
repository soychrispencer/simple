import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    agendaProfessionalProfiles,
    publicProfiles,
    serenataProviderGroups,
} from '../../db/schema.js';
import type { MercadoPagoOperatorVertical } from './oauth-state.js';
import type { MercadoPagoOperatorTokens } from './operator-oauth.js';

export type MercadoPagoOperatorStatus = {
    connected: boolean;
    userId: string | null;
};

const MP_NULL_FIELDS = {
    mpAccessToken: null,
    mpPublicKey: null,
    mpUserId: null,
    mpRefreshToken: null,
} as const;

async function resolveSerenataProviderGroup(userId: string) {
    return db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.ownerUserId, userId),
        orderBy: [desc(serenataProviderGroups.updatedAt)],
    });
}

export async function userHasMercadoPagoOperatorTarget(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
): Promise<boolean> {
    if (vertical === 'agenda') {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, userId),
            columns: { id: true },
        });
        return Boolean(profile);
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
            columns: { id: true },
        });
        return Boolean(profile);
    }
    const group = await resolveSerenataProviderGroup(userId);
    return Boolean(group);
}

export async function getMercadoPagoOperatorStatus(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
): Promise<MercadoPagoOperatorStatus> {
    if (vertical === 'agenda') {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, userId),
            columns: { mpAccessToken: true, mpUserId: true },
        });
        return {
            connected: Boolean(profile?.mpAccessToken),
            userId: profile?.mpUserId ?? null,
        };
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
            columns: { mpAccessToken: true, mpUserId: true },
        });
        return {
            connected: Boolean(profile?.mpAccessToken),
            userId: profile?.mpUserId ?? null,
        };
    }

    const group = await resolveSerenataProviderGroup(userId);
    return {
        connected: Boolean(group?.mpAccessToken),
        userId: group?.mpUserId ?? null,
    };
}

export async function getMercadoPagoOperatorAccessToken(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
): Promise<string | null> {
    const status = await getMercadoPagoOperatorStatus(userId, vertical);
    if (!status.connected) return null;

    if (vertical === 'agenda') {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, userId),
            columns: { mpAccessToken: true },
        });
        return profile?.mpAccessToken ?? null;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
            columns: { mpAccessToken: true },
        });
        return profile?.mpAccessToken ?? null;
    }

    const group = await resolveSerenataProviderGroup(userId);
    return group?.mpAccessToken ?? null;
}

export async function saveMercadoPagoOperatorTokens(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
    tokens: MercadoPagoOperatorTokens,
): Promise<void> {
    const now = new Date();
    const patch = {
        mpAccessToken: tokens.accessToken,
        mpPublicKey: tokens.publicKey,
        mpUserId: tokens.userId,
        mpRefreshToken: tokens.refreshToken,
        updatedAt: now,
    };

    if (vertical === 'agenda') {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, userId),
            columns: { id: true },
        });
        if (!profile) throw new Error('No encontramos tu perfil de agenda.');
        await db.update(agendaProfessionalProfiles).set(patch).where(eq(agendaProfessionalProfiles.id, profile.id));
        return;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
            columns: { id: true },
        });
        if (!profile) throw new Error('No encontramos tu perfil público.');
        await db.update(publicProfiles).set(patch).where(eq(publicProfiles.id, profile.id));
        return;
    }

    const group = await resolveSerenataProviderGroup(userId);
    if (!group) throw new Error('Crea tu perfil de mariachi antes de conectar MercadoPago.');
    await db.update(serenataProviderGroups).set(patch).where(eq(serenataProviderGroups.id, group.id));
}

export async function disconnectMercadoPagoOperator(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
): Promise<void> {
    const now = new Date();

    if (vertical === 'agenda') {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, userId),
            columns: { id: true },
        });
        if (!profile) return;
        await db.update(agendaProfessionalProfiles).set({ ...MP_NULL_FIELDS, updatedAt: now }).where(eq(agendaProfessionalProfiles.id, profile.id));
        return;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
            columns: { id: true },
        });
        if (!profile) return;
        await db.update(publicProfiles).set({ ...MP_NULL_FIELDS, updatedAt: now }).where(eq(publicProfiles.id, profile.id));
        return;
    }

    const group = await resolveSerenataProviderGroup(userId);
    if (!group) return;
    await db.update(serenataProviderGroups).set({ ...MP_NULL_FIELDS, updatedAt: now }).where(eq(serenataProviderGroups.id, group.id));
}
