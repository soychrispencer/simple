import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
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

function businessVerticalFilter(vertical?: AddressBookBusinessVertical) {
    if (!vertical) return undefined;
    return eq(addressBook.vertical, vertical);
}

export function createAddressBookService(getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>) {
    async function getAddressBookEntries(
        userId: string,
        scope?: AddressBookScope,
        vertical?: AddressBookBusinessVertical,
    ): Promise<AddressBookEntry[]> {
        const conditions = [eq(addressBook.userId, userId)];
        if (scope) {
            conditions.push(eq(addressBook.scope, scope));
        }
        if (scope === 'business' && vertical) {
            conditions.push(eq(addressBook.vertical, vertical));
        }

        const rows = await db
            .select()
            .from(addressBook)
            .where(and(...conditions))
            .orderBy(desc(addressBook.isDefault), desc(addressBook.updatedAt));

        return rows.map(mapAddressBookRow);
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

        const isPublicVisible = scope === 'business' ? Boolean(input.isPublicVisible) : false;
        if (input.isPublicVisible && scope !== 'business') {
            throw new Error('Solo las direcciones comerciales pueden mostrarse en el perfil público.');
        }

        const now = new Date();
        const nextId = existingId ?? randomUUID();
        const accountId = await getPrimaryAccountIdForUser(userId);

        const data = {
            accountId,
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
                eq(addressBook.userId, userId),
                eq(addressBook.scope, scope),
                eq(addressBook.isDefault, true),
            ];
            if (scope === 'business' && businessVertical) {
                defaultConditions.push(eq(addressBook.vertical, businessVertical));
            }
            if (scope === 'personal') {
                defaultConditions.push(isNull(addressBook.vertical));
            }
            await db
                .update(addressBook)
                .set({ isDefault: false, updatedAt: now })
                .where(and(...defaultConditions));
        }

        if (existingId) {
            await db
                .update(addressBook)
                .set(data)
                .where(and(eq(addressBook.userId, userId), eq(addressBook.id, existingId)));
        } else {
            await db.insert(addressBook).values({
                ...data,
                id: nextId,
                userId,
                createdAt: now,
            });
        }

        return getAddressBookEntries(
            userId,
            scope,
            scope === 'business' ? businessVertical ?? undefined : undefined,
        );
    }

    async function deleteAddressBookEntry(userId: string, addressId: string): Promise<AddressBookEntry[]> {
        const [target] = await db
            .select()
            .from(addressBook)
            .where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

        if (!target) return getAddressBookEntries(userId);

        const scope = (target.scope as AddressBookScope) || 'personal';
        const vertical = (target.vertical as AddressBookBusinessVertical | null) ?? null;
        await db.delete(addressBook).where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

        if (target.isDefault) {
            const remainingConditions = [
                eq(addressBook.userId, userId),
                eq(addressBook.scope, scope),
            ];
            if (scope === 'business' && vertical) {
                remainingConditions.push(eq(addressBook.vertical, vertical));
            }
            const remaining = await db
                .select()
                .from(addressBook)
                .where(and(...remainingConditions))
                .limit(1);

            if (remaining.length > 0) {
                await db
                    .update(addressBook)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where(eq(addressBook.id, remaining[0].id));
            }
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
