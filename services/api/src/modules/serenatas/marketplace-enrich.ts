import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataGroupServices, serenataProviderGroups } from '../../db/schema.js';

export function mapProviderGroup(row: typeof serenataProviderGroups.$inferSelect) {
    return {
        id: row.id,
        ownerUserId: row.ownerUserId,
        ownerId: row.ownerId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        logoUrl: row.logoUrl,
        coverUrl: row.coverUrl,
        phone: row.phone,
        whatsapp: row.whatsapp,
        region: row.region,
        comunaBase: row.comunaBase,
        serviceComunas: row.serviceComunas ?? [],
        status: row.status,
        isVerified: row.isVerified,
        ratingAverage: Number(row.ratingAverage ?? 0),
        ratingCount: row.ratingCount,
        slaHours: row.slaHours,
        bookingMode: row.bookingMode,
        bufferMinutes: row.bufferMinutes,
        requiresAdvancePayment: row.requiresAdvancePayment,
        advancePaymentInstructions: row.advancePaymentInstructions,
        acceptsCash: row.acceptsCash,
        acceptsTransfer: row.acceptsTransfer,
        acceptsMp: row.acceptsMp,
        acceptsPaymentLink: row.acceptsPaymentLink,
        paymentLinkUrl: row.paymentLinkUrl,
        bankTransferData: row.bankTransferData ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function enrichProviderGroupsForMarketplace(groups: (typeof serenataProviderGroups.$inferSelect)[]) {
    if (groups.length === 0) return [];
    const groupIds = groups.map((group) => group.id);
    const services = await db
        .select()
        .from(serenataGroupServices)
        .where(and(inArray(serenataGroupServices.providerGroupId, groupIds), eq(serenataGroupServices.isActive, true)))
        .orderBy(asc(serenataGroupServices.sortOrder), asc(serenataGroupServices.price));

    return groups.map((group) => {
        const groupServices = services.filter((service) => service.providerGroupId === group.id);
        const prices = groupServices.map((service) => service.price).filter((price) => Number.isFinite(price));
        return {
            ...mapProviderGroup(group),
            startingPrice: prices.length > 0 ? Math.min(...prices) : null,
            activeServicesCount: groupServices.length,
            servicesPreview: groupServices.slice(0, 3).map((service) => ({
                id: service.id,
                name: service.name,
                price: service.price,
                musiciansCount: service.musiciansCount,
                durationMinutes: service.durationMinutes,
                songsIncluded: service.songsIncluded ?? 0,
            })),
        };
    });
}
