import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accountUsers, accounts } from '../../db/schema.js';
import {
    agendaProfessionalProfiles,
    publicProfiles,
    serenataProviderGroups,
} from '../../db/schema.js';
import { getAgendaProfile } from '../agenda/plan-limits.js';
import {
    lockSocialIntegrationWriteAccess,
    requireSocialIntegrationAccountId,
    SocialIntegrationAccessError,
} from '../integrations/social-write-access.js';
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

async function findMarketplaceOperatorProfile(
    userId: string,
    vertical: 'autos' | 'propiedades',
    accountId?: string | null,
) {
    if (!accountId) return null;

    const profile = await db.query.publicProfiles.findFirst({
        where: and(
            eq(publicProfiles.accountId, accountId),
            eq(publicProfiles.vertical, vertical),
        ),
    });
    if (profile) return profile;

    const [account] = await db.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
    if (!account?.isPersonal || account.ownerUserId !== userId) return null;

    return db.query.publicProfiles.findFirst({
        where: and(
            eq(publicProfiles.userId, userId),
            eq(publicProfiles.vertical, vertical),
            isNull(publicProfiles.accountId),
        ),
    });
}

async function lockAgendaOperatorProfile(tx: any, userId: string, accountId: string): Promise<string> {
    const [membership] = await tx.select({ id: accountUsers.id })
        .from(accountUsers)
        .where(and(
            eq(accountUsers.accountId, accountId),
            eq(accountUsers.userId, userId),
        ))
        .limit(1)
        .for('update');
    if (!membership) {
        throw new SocialIntegrationAccessError('Ya no tienes acceso al espacio donde estaba configurado tu perfil de agenda.');
    }

    const [account] = await tx.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1)
        .for('update');
    if (!account) {
        throw new Error('No encontramos el espacio de tu perfil de agenda.');
    }

    let [profile] = await tx.select({ id: agendaProfessionalProfiles.id })
        .from(agendaProfessionalProfiles)
        .where(and(
            eq(agendaProfessionalProfiles.userId, userId),
            eq(agendaProfessionalProfiles.accountId, accountId),
        ))
        .limit(1)
        .for('update');

    if (!profile && account.isPersonal && account.ownerUserId === userId) {
        [profile] = await tx.select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(and(
                eq(agendaProfessionalProfiles.userId, userId),
                isNull(agendaProfessionalProfiles.accountId),
            ))
            .limit(1)
            .for('update');
    }
    if (!profile) throw new Error('No encontramos tu perfil de agenda.');
    return profile.id;
}

export async function userHasMercadoPagoOperatorTarget(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
    accountId?: string | null,
): Promise<boolean> {
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(userId, accountId);
        return Boolean(profile);
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await findMarketplaceOperatorProfile(userId, vertical, accountId);
        return Boolean(profile);
    }
    const group = await resolveSerenataProviderGroup(userId);
    return Boolean(group);
}

export async function getMercadoPagoOperatorStatus(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
    accountId?: string | null,
): Promise<MercadoPagoOperatorStatus> {
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(userId, accountId);
        return {
            connected: Boolean(profile?.mpAccessToken),
            userId: profile?.mpUserId ?? null,
        };
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await findMarketplaceOperatorProfile(userId, vertical, accountId);
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
    accountId?: string | null,
): Promise<string | null> {
    const status = await getMercadoPagoOperatorStatus(userId, vertical, accountId);
    if (!status.connected) return null;

    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(userId, accountId);
        return profile?.mpAccessToken ?? null;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const profile = await findMarketplaceOperatorProfile(userId, vertical, accountId);
        return profile?.mpAccessToken ?? null;
    }

    const group = await resolveSerenataProviderGroup(userId);
    return group?.mpAccessToken ?? null;
}

export async function saveMercadoPagoOperatorTokens(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
    tokens: MercadoPagoOperatorTokens,
    accountId?: string | null,
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
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            const profileId = await lockAgendaOperatorProfile(tx, userId, workspaceId);
            await tx.update(agendaProfessionalProfiles).set(patch).where(and(
                eq(agendaProfessionalProfiles.id, profileId),
                eq(agendaProfessionalProfiles.userId, userId),
            ));
        });
        return;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId, accountId: workspaceId });

            let [profile] = await tx.select({ id: publicProfiles.id })
                .from(publicProfiles)
                .where(and(
                    eq(publicProfiles.accountId, workspaceId),
                    eq(publicProfiles.vertical, vertical),
                ))
                .limit(1)
                .for('update');

            if (!profile) {
                const [account] = await tx.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
                    .from(accounts)
                    .where(eq(accounts.id, workspaceId))
                    .limit(1);
                if (account?.isPersonal && account.ownerUserId === userId) {
                    [profile] = await tx.select({ id: publicProfiles.id })
                        .from(publicProfiles)
                        .where(and(
                            eq(publicProfiles.userId, userId),
                            eq(publicProfiles.vertical, vertical),
                            isNull(publicProfiles.accountId),
                        ))
                        .limit(1)
                        .for('update');
                }
            }

            if (!profile) throw new Error('No encontramos tu perfil público.');
            await tx.update(publicProfiles).set(patch).where(eq(publicProfiles.id, profile.id));
        });
        return;
    }

    const group = await resolveSerenataProviderGroup(userId);
    if (!group) throw new Error('Crea tu perfil de mariachi antes de conectar MercadoPago.');
    await db.update(serenataProviderGroups).set(patch).where(eq(serenataProviderGroups.id, group.id));
}

export async function disconnectMercadoPagoOperator(
    userId: string,
    vertical: MercadoPagoOperatorVertical,
    accountId?: string | null,
): Promise<void> {
    const now = new Date();

    if (vertical === 'agenda') {
        if (!accountId) return;
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            const profileId = await lockAgendaOperatorProfile(tx, userId, workspaceId);
            await tx.update(agendaProfessionalProfiles).set({ ...MP_NULL_FIELDS, updatedAt: now }).where(and(
                eq(agendaProfessionalProfiles.id, profileId),
                eq(agendaProfessionalProfiles.userId, userId),
            ));
        });
        return;
    }

    if (vertical === 'autos' || vertical === 'propiedades') {
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId, accountId: workspaceId });

            let [profile] = await tx.select({ id: publicProfiles.id })
                .from(publicProfiles)
                .where(and(
                    eq(publicProfiles.accountId, workspaceId),
                    eq(publicProfiles.vertical, vertical),
                ))
                .limit(1)
                .for('update');

            if (!profile) {
                const [account] = await tx.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
                    .from(accounts)
                    .where(eq(accounts.id, workspaceId))
                    .limit(1);
                if (account?.isPersonal && account.ownerUserId === userId) {
                    [profile] = await tx.select({ id: publicProfiles.id })
                        .from(publicProfiles)
                        .where(and(
                            eq(publicProfiles.userId, userId),
                            eq(publicProfiles.vertical, vertical),
                            isNull(publicProfiles.accountId),
                        ))
                        .limit(1)
                        .for('update');
                }
            }

            if (profile) {
                await tx.update(publicProfiles)
                    .set({ ...MP_NULL_FIELDS, updatedAt: now })
                    .where(eq(publicProfiles.id, profile.id));
            }
        });
        return;
    }

    const group = await resolveSerenataProviderGroup(userId);
    if (!group) return;
    await db.update(serenataProviderGroups).set({ ...MP_NULL_FIELDS, updatedAt: now }).where(eq(serenataProviderGroups.id, group.id));
}
