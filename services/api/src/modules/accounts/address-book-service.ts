import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import type { z } from 'zod';
import { isKindValidForScope, resolveAddressBookScope } from '@simple/utils';
import type {
    AddressBookBusinessVertical,
    AddressBookEntry,
    AddressBookKind,
    AddressBookScope,
    GeoPoint,
} from '../../lib/domain-types.js';
import { addressBookWriteSchema } from '../../lib/request-schemas.js';
import { db } from '../../db/index.js';
import { addressBook } from '../../db/schema.js';
import { makeGeoPoint } from '../listings/location.js';
import { runAccountManagerWrite } from './write-access.js';

export class AddressBookWriteAccessError extends Error {
    readonly status = 403;

    constructor() {
        super('Tus permisos en este espacio cambiaron. Actualiza la página e inténtalo nuevamente.');
        this.name = 'AddressBookWriteAccessError';
    }
}

function mapAddressBookRow(row: typeof addressBook.$inferSelect): AddressBookEntry {
    return {
        id: row.id,
        kind: row.kind as AddressBookKind,
        scope: (row.scope as AddressBookScope) || 'personal',
        vertical: (row.vertical as AddressBookBusinessVertical | null) ?? null,
        label: row.label,
        countryCode: row.countryCode,
        regionId: row.regionId,
        regionName: row.regionName,
        communeId: row.communeId,
        communeName: row.communeName,
        neighborhood: row.neighborhood,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        postalCode: row.postalCode,
        arrivalInstructions: row.arrivalInstructions ?? null,
        isDefault: row.isDefault,
        isPublicVisible: Boolean(row.isPublicVisible),
        geoPoint: (row.geoPoint as GeoPoint) || makeGeoPoint(null, null, 'none'),
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

export function createAddressBookService(
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>,
    isPersonalAccountForUser?: (userId: string, accountId: string) => boolean,
    getAccountMembershipFromDb?: (userId: string) => Promise<{ accountId: string; role: string } | null>,
) {
    async function getCurrentAccountId(userId: string) {
        if (getAccountMembershipFromDb) {
            return (await getAccountMembershipFromDb(userId))?.accountId ?? null;
        }
        return getPrimaryAccountIdForUser(userId);
    }

    function sortEntries(entries: AddressBookEntry[]) {
        return entries.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt - a.updatedAt);
    }

    async function getBusinessEntries(
        userId: string,
        accountId: string | null,
        vertical?: AddressBookBusinessVertical,
    ): Promise<AddressBookEntry[]> {
        if (!accountId) return [];
        const conditions = [
            eq(addressBook.accountId, accountId),
            eq(addressBook.scope, 'business'),
        ];
        if (vertical) conditions.push(eq(addressBook.vertical, vertical));
        const rows = await db.select().from(addressBook).where(and(...conditions));
        const entries = rows.map(mapAddressBookRow);

        // Older business addresses may not have an accountId. Keep them visible
        // only inside the owner's verified personal account.
        if (isPersonalAccountForUser?.(userId, accountId)) {
            const legacyConditions = [
                eq(addressBook.userId, userId),
                isNull(addressBook.accountId),
                eq(addressBook.scope, 'business'),
            ];
            if (vertical) legacyConditions.push(eq(addressBook.vertical, vertical));
            const legacyRows = await db.select().from(addressBook).where(and(...legacyConditions));
            entries.push(...legacyRows.map(mapAddressBookRow));
        }

        return sortEntries(entries);
    }

    async function getAddressBookEntries(
        userId: string,
        scope?: AddressBookScope,
        vertical?: AddressBookBusinessVertical,
    ): Promise<AddressBookEntry[]> {
        const accountId = await getCurrentAccountId(userId);
        if (scope === 'business') return getBusinessEntries(userId, accountId, vertical);

        const personalConditions = [
            eq(addressBook.userId, userId),
            eq(addressBook.scope, 'personal'),
        ];
        const personalRows = await db.select().from(addressBook).where(and(...personalConditions));
        const personalEntries = personalRows.map(mapAddressBookRow);
        if (scope === 'personal') return sortEntries(personalEntries);

        return sortEntries([
            ...personalEntries,
            ...await getBusinessEntries(userId, accountId),
        ]);
    }

    async function upsertAddressBookEntry(
        userId: string,
        input: z.infer<typeof addressBookWriteSchema>,
        existingId?: string,
    ): Promise<AddressBookEntry[]> {
        const scope = resolveAddressBookScope(input.scope, input.kind);
        if (!isKindValidForScope(input.kind, scope)) {
            throw new Error('El tipo de dirección no es compatible con el ámbito seleccionado.');
        }

        const businessVertical = scope === 'business'
            ? (input.vertical as AddressBookBusinessVertical | null | undefined) ?? null
            : null;
        if (scope === 'business' && !businessVertical) {
            throw new Error('La vertical es obligatoria para direcciones de negocio.');
        }

        const accountId = await getCurrentAccountId(userId);
        if (scope === 'business' && !accountId) {
            throw new Error('No encontramos el espacio de trabajo para esta dirección.');
        }

        const isPublicVisible = scope === 'business' ? Boolean(input.isPublicVisible) : false;
        if (input.isPublicVisible && scope !== 'business') {
            throw new Error('Solo las direcciones comerciales pueden mostrarse en el perfil público.');
        }
        const currentAccountIsPersonal = Boolean(accountId && isPersonalAccountForUser?.(userId, accountId));
        let previousScope: AddressBookScope | null = null;
        if (existingId) {
            const [preflight] = await db.select({ scope: addressBook.scope })
                .from(addressBook)
                .where(eq(addressBook.id, existingId))
                .limit(1);
            if (!preflight) throw new Error('Dirección no encontrada.');
            previousScope = (preflight.scope as AddressBookScope) || 'personal';
        }
        const requiresBusinessAccess = scope === 'business' || previousScope === 'business';
        const now = new Date();
        const nextId = existingId ?? randomUUID();

        const save = async (tx: any) => {
            let existingRecord: typeof addressBook.$inferSelect | null = null;
            if (existingId) {
                const [record] = await tx.select().from(addressBook)
                    .where(eq(addressBook.id, existingId)).limit(1).for('update');
                if (!record) throw new Error('Dirección no encontrada.');
                existingRecord = record;

                const existingScope = (record.scope as AddressBookScope) || 'personal';
                const belongsToUser = record.userId === userId;
                const belongsToAccount = existingScope === 'business' && Boolean(accountId && record.accountId === accountId);
                const isLegacyPersonalBusinessAddress = existingScope === 'business'
                    && currentAccountIsPersonal
                    && record.accountId === null
                    && belongsToUser;
                if (existingScope === 'personal' ? !belongsToUser : !(belongsToAccount || isLegacyPersonalBusinessAddress)) {
                    throw new Error('Dirección no encontrada.');
                }
            }

            const data = {
                accountId: scope === 'business' ? accountId : null,
                kind: input.kind,
                scope,
                vertical: businessVertical,
                label: input.label,
                countryCode: input.countryCode,
                regionId: input.regionId,
                regionName: input.regionName,
                communeId: input.communeId,
                communeName: input.communeName,
                neighborhood: input.neighborhood,
                addressLine1: input.addressLine1,
                addressLine2: input.addressLine2,
                postalCode: input.postalCode,
                arrivalInstructions: input.arrivalInstructions ?? null,
                isDefault: input.isDefault,
                isPublicVisible,
                geoPoint: input.geoPoint ?? makeGeoPoint(null, null, 'none'),
                updatedAt: now,
            };

            if (input.isDefault) {
                const defaultConditions = [
                    eq(addressBook.scope, scope),
                    eq(addressBook.isDefault, true),
                ];
                if (scope === 'business' && accountId && businessVertical) {
                    defaultConditions.push(eq(addressBook.accountId, accountId));
                    defaultConditions.push(eq(addressBook.vertical, businessVertical));
                    await tx.update(addressBook).set({ isDefault: false, updatedAt: now })
                        .where(and(...defaultConditions));
                    if (currentAccountIsPersonal) {
                        await tx.update(addressBook).set({ isDefault: false, updatedAt: now })
                            .where(and(
                                eq(addressBook.userId, userId),
                                isNull(addressBook.accountId),
                                eq(addressBook.scope, 'business'),
                                eq(addressBook.vertical, businessVertical),
                                eq(addressBook.isDefault, true),
                            ));
                    }
                } else {
                    defaultConditions.push(eq(addressBook.userId, userId));
                    defaultConditions.push(isNull(addressBook.vertical));
                    await tx.update(addressBook).set({ isDefault: false, updatedAt: now })
                        .where(and(...defaultConditions));
                }
            }

            if (existingRecord) {
                await tx.update(addressBook)
                    .set({
                        ...data,
                        userId: scope === 'personal' ? userId : existingRecord.userId,
                    })
                    .where(eq(addressBook.id, nextId));
            } else {
                await tx.insert(addressBook).values({
                    ...data,
                    id: nextId,
                    userId,
                    createdAt: now,
                });
            }
        };

        if (requiresBusinessAccess) {
            const write = await runAccountManagerWrite(db, { userId, accountId }, save);
            if (!write.ok) throw new AddressBookWriteAccessError();
        } else {
            await db.transaction(save);
        }

        return getAddressBookEntries(
            userId,
            scope,
            scope === 'business' ? businessVertical ?? undefined : undefined,
        );
    }

    async function deleteAddressBookEntry(userId: string, addressId: string): Promise<AddressBookEntry[]> {
        const accountId = await getCurrentAccountId(userId);
        const [preflight] = await db.select({
            id: addressBook.id,
            scope: addressBook.scope,
            vertical: addressBook.vertical,
        })
            .from(addressBook)
            .where(eq(addressBook.id, addressId)).limit(1);
        if (!preflight) return getAddressBookEntries(userId);

        const scope = (preflight.scope as AddressBookScope) || 'personal';
        let vertical = (preflight.vertical as AddressBookBusinessVertical | null) ?? null;
        const currentAccountIsPersonal = Boolean(accountId && isPersonalAccountForUser?.(userId, accountId));
        const remove = async (tx: any) => {
            const [target] = await tx.select().from(addressBook)
                .where(eq(addressBook.id, addressId)).limit(1).for('update');
            if (!target) return false;

            const targetScope = (target.scope as AddressBookScope) || 'personal';
            const targetVertical = (target.vertical as AddressBookBusinessVertical | null) ?? null;
            vertical = targetVertical;
            const belongsToUser = target.userId === userId;
            const belongsToAccount = targetScope === 'business' && Boolean(accountId && target.accountId === accountId);
            const legacyPersonalBusinessAddress = targetScope === 'business'
                && currentAccountIsPersonal
                && target.accountId === null
                && belongsToUser;
            if (targetScope !== scope
                || (targetScope === 'personal' ? !belongsToUser : !(belongsToAccount || legacyPersonalBusinessAddress))) {
                return false;
            }

            await tx.delete(addressBook).where(eq(addressBook.id, addressId));
            if (!target.isDefault) return true;

            const conditions = [eq(addressBook.scope, targetScope)];
            if (targetScope === 'business' && targetVertical) {
                conditions.push(eq(addressBook.vertical, targetVertical));
                if (accountId && currentAccountIsPersonal) {
                    conditions.push(or(
                        eq(addressBook.accountId, accountId),
                        and(
                            eq(addressBook.userId, userId),
                            isNull(addressBook.accountId),
                        ),
                    )!);
                } else if (accountId) {
                    conditions.push(eq(addressBook.accountId, accountId));
                }
            } else {
                conditions.push(eq(addressBook.userId, userId), isNull(addressBook.vertical));
            }
            const candidates = await tx.select().from(addressBook)
                .where(and(...conditions))
                .orderBy(desc(addressBook.updatedAt), desc(addressBook.createdAt));
            const nextDefault = candidates[0];
            if (nextDefault) {
                await tx.update(addressBook)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where(eq(addressBook.id, nextDefault.id));
            }
            return true;
        };

        if (scope === 'business') {
            const write = await runAccountManagerWrite(db, { userId, accountId }, remove);
            if (!write.ok) throw new AddressBookWriteAccessError();
        } else {
            await db.transaction(remove);
        }

        return getAddressBookEntries(
            userId,
            scope,
            scope === 'business' && vertical ? vertical : undefined,
        );
    }

    return {
        getAddressBookEntries,
        upsertAddressBookEntry,
        deleteAddressBookEntry,
    };
}
