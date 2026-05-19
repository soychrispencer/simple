import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { AddressBookEntry, AddressBookKind, GeoPoint } from '../../lib/domain-types.js';
import { addressBookWriteSchema } from '../../lib/request-schemas.js';
import { db } from '../../db/index.js';
import { addressBook } from '../../db/schema.js';
import { makeGeoPoint } from '../listings/location.js';

export function createAddressBookService(getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>) {
    async function getAddressBookEntries(userId: string): Promise<AddressBookEntry[]> {
        const rows = await db
            .select()
            .from(addressBook)
            .where(eq(addressBook.userId, userId))
            .orderBy(desc(addressBook.isDefault), desc(addressBook.updatedAt));

        return rows.map((row) => ({
            id: row.id,
            kind: row.kind as AddressBookKind,
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
            geoPoint: (row.geoPoint as GeoPoint) || makeGeoPoint(null, null, 'none'),
            createdAt: row.createdAt.getTime(),
            updatedAt: row.updatedAt.getTime(),
        }));
    }

    async function upsertAddressBookEntry(
        userId: string,
        input: z.infer<typeof addressBookWriteSchema>,
        existingId?: string,
    ): Promise<AddressBookEntry[]> {
        const now = new Date();
        const nextId = existingId ?? randomUUID();
        const accountId = await getPrimaryAccountIdForUser(userId);

        const data = {
            accountId,
            kind: input.kind,
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
            geoPoint: input.geoPoint ?? makeGeoPoint(null, null, 'none'),
            updatedAt: now,
        };

        if (input.isDefault) {
            await db
                .update(addressBook)
                .set({ isDefault: false, updatedAt: now })
                .where(and(eq(addressBook.userId, userId), eq(addressBook.isDefault, true)));
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

        return getAddressBookEntries(userId);
    }

    async function deleteAddressBookEntry(userId: string, addressId: string): Promise<AddressBookEntry[]> {
        const [target] = await db
            .select()
            .from(addressBook)
            .where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

        if (!target) return getAddressBookEntries(userId);

        await db.delete(addressBook).where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

        if (target.isDefault) {
            const remaining = await db
                .select()
                .from(addressBook)
                .where(eq(addressBook.userId, userId))
                .limit(1);

            if (remaining.length > 0) {
                await db
                    .update(addressBook)
                    .set({ isDefault: true, updatedAt: new Date() })
                    .where(eq(addressBook.id, remaining[0].id));
            }
        }

        return getAddressBookEntries(userId);
    }

    return {
        getAddressBookEntries,
        upsertAddressBookEntry,
        deleteAddressBookEntry,
    };
}
