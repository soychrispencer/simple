import { eq, or, sql, inArray } from 'drizzle-orm';
export type PermanentlyDeleteUserDeps = {
    db: any;
    tables: Record<string, any>;
    extractAllListingMediaUrls: (listing: { rawData?: unknown }) => string[];
    deleteStoredMediaUrls: (urls: string[]) => Promise<void>;
    instagramAccountKey: (userId: string, vertical: string) => string;
    publicProfileUserVerticalKey: (userId: string, vertical: string) => string;
    caches: {
        usersById: Map<string, unknown>;
        savedByUser: Map<string, unknown>;
        followsByUser: Map<string, unknown>;
        boostOrdersByUser: Map<string, unknown>;
        addressBookByUser: Map<string, unknown>;
        paymentOrdersByUser: Map<string, unknown>;
        activeSubscriptionsByUser: Map<string, unknown>;
        instagramPublicationsByUser: Map<string, unknown>;
        publicProfilesByUserVertical: Map<string, unknown>;
        publicProfileTeamMembersByUserVertical: Map<string, unknown>;
        instagramAccountByUserVertical: Map<string, unknown>;
        listingsById: Map<string, { ownerId: string }>;
        listingLeadCountsByListing: Map<string, number>;
        publicProfilesByVerticalSlug: Map<string, { userId: string }>;
    };
};

export function createPermanentlyDeleteUser(deps: PermanentlyDeleteUserDeps) {
    const {
        db,
        tables,
        extractAllListingMediaUrls,
        deleteStoredMediaUrls,
        instagramAccountKey,
        publicProfileUserVerticalKey,
        caches,
    } = deps;

    const {
        agendaProfessionalProfiles,
        listings,
        listingLeads,
        messageThreads,
        messageEntries,
        serviceLeads,
        instagramAccounts,
        instagramPublications,
        savedListings,
        boostOrders,
        adCampaigns,
        listingDrafts,
        follows,
        crmPipelineColumns,
        publicProfileTeamMembers,
        publicProfiles,
        passwordResetTokens,
        emailVerificationTokens,
        accounts,
        accountUsers,
        agendaClients,
        agendaPacks,
        agendaGroupSessions,
        agendaClientTagAssignments,
        agendaClientAttachments,
        agendaClientPacks,
        agendaGroupAttendees,
        agendaNpsResponses,
        agendaSessionNotes,
        agendaPayments,
        agendaAppointments,
        agendaReferrals,
        agendaPromotions,
        agendaBlockedSlots,
        agendaAvailabilityRules,
        agendaLocations,
        agendaServices,
        agendaAuditEvents,
        agendaNotificationEvents,
        pushSubscriptions,
        users,
        listingLeadActivities,
        serviceLeadActivities,
        agendaClientTags,
    } = tables;

    return async function permanentlyDeleteUser(userId: string): Promise<void> {
        let instagramAccountRows: Array<{ id: string; vertical: string }> = [];
        let listingMediaUrlsToDelete: string[] = [];

        await db.transaction(async (tx: any) => {
            const agendaProfile = await tx
                .select({ id: agendaProfessionalProfiles.id })
                .from(agendaProfessionalProfiles)
                .where(eq(agendaProfessionalProfiles.userId, userId))
                .limit(1);
            const professionalId = agendaProfile.length > 0 ? agendaProfile[0].id : null;

            const ownedListings = await tx
                .select({ id: listings.id, rawData: listings.rawData })
                .from(listings)
                .where(eq(listings.ownerId, userId));
            const ownedListingIds = ownedListings.map((item: { id: string }) => item.id);
            listingMediaUrlsToDelete = ownedListings.flatMap((item: { rawData: unknown }) =>
                extractAllListingMediaUrls(item),
            );

            const listingLeadRows = await tx
                .select({ id: listingLeads.id })
                .from(listingLeads)
                .where(
                    or(
                        eq(listingLeads.ownerUserId, userId),
                        eq(listingLeads.buyerUserId, userId),
                        eq(listingLeads.assignedToUserId, userId),
                        ownedListingIds.length > 0 ? sql`${listingLeads.listingId} = ANY(${ownedListingIds})` : sql`false`,
                    ),
                );
            const listingLeadIds = listingLeadRows.map((item: { id: string }) => item.id);

            const threadRows = await tx
                .select({ id: messageThreads.id })
                .from(messageThreads)
                .where(
                    or(
                        eq(messageThreads.ownerUserId, userId),
                        eq(messageThreads.buyerUserId, userId),
                        listingLeadIds.length > 0 ? sql`${messageThreads.leadId} = ANY(${listingLeadIds})` : sql`false`,
                    ),
                );
            const threadIds = threadRows.map((item: { id: string }) => item.id);

            const serviceLeadRows = await tx
                .select({ id: serviceLeads.id })
                .from(serviceLeads)
                .where(or(eq(serviceLeads.userId, userId), eq(serviceLeads.assignedToUserId, userId)));
            const serviceLeadIds = serviceLeadRows.map((item: { id: string }) => item.id);

            instagramAccountRows = await tx
                .select({ id: instagramAccounts.id, vertical: instagramAccounts.vertical })
                .from(instagramAccounts)
                .where(eq(instagramAccounts.userId, userId));
            const instagramAccountIds = instagramAccountRows.map((item) => item.id);

            if (threadIds.length > 0) {
                await tx.delete(messageEntries).where(sql`${messageEntries.threadId} = ANY(${threadIds})`);
            }
            await tx.delete(messageEntries).where(eq(messageEntries.senderUserId, userId));
            if (threadIds.length > 0) {
                await tx.delete(messageThreads).where(sql`${messageThreads.id} = ANY(${threadIds})`);
            }

            if (listingLeadIds.length > 0) {
                await tx.delete(listingLeadActivities).where(sql`${listingLeadActivities.leadId} = ANY(${listingLeadIds})`);
            }
            await tx.delete(listingLeadActivities).where(eq(listingLeadActivities.actorUserId, userId));
            if (listingLeadIds.length > 0) {
                await tx.delete(listingLeads).where(sql`${listingLeads.id} = ANY(${listingLeadIds})`);
            }

            if (serviceLeadIds.length > 0) {
                await tx.delete(serviceLeadActivities).where(sql`${serviceLeadActivities.leadId} = ANY(${serviceLeadIds})`);
            }
            await tx.delete(serviceLeadActivities).where(eq(serviceLeadActivities.actorUserId, userId));
            if (serviceLeadIds.length > 0) {
                await tx.delete(serviceLeads).where(sql`${serviceLeads.id} = ANY(${serviceLeadIds})`);
            }

            if (instagramAccountIds.length > 0) {
                await tx.delete(instagramPublications).where(sql`${instagramPublications.instagramAccountId} = ANY(${instagramAccountIds})`);
            }
            await tx.delete(instagramPublications).where(eq(instagramPublications.userId, userId));

            if (ownedListingIds.length > 0) {
                await tx.delete(savedListings).where(sql`${savedListings.listingId} = ANY(${ownedListingIds})`);
            }
            await tx.delete(savedListings).where(eq(savedListings.userId, userId));

            if (ownedListingIds.length > 0) {
                await tx.delete(boostOrders).where(sql`${boostOrders.listingId} = ANY(${ownedListingIds})`);
            }
            await tx.delete(boostOrders).where(eq(boostOrders.userId, userId));

            await tx.delete(adCampaigns).where(eq(adCampaigns.userId, userId));
            await tx.delete(listingDrafts).where(eq(listingDrafts.userId, userId));
            await tx.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)));
            await tx.delete(crmPipelineColumns).where(eq(crmPipelineColumns.userId, userId));
            await tx.delete(publicProfileTeamMembers).where(eq(publicProfileTeamMembers.userId, userId));
            await tx.delete(publicProfiles).where(eq(publicProfiles.userId, userId));
            await tx.delete(instagramAccounts).where(eq(instagramAccounts.userId, userId));
            await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
            await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

            const accountRows = await tx
                .select({ id: accounts.id })
                .from(accounts)
                .where(eq(accounts.ownerUserId, userId));
            const accountIds = accountRows.map((r: { id: string }) => r.id);

            if (accountIds.length > 0) {
                await tx.delete(accountUsers).where(inArray(accountUsers.accountId, accountIds));
                await tx.delete(accounts).where(inArray(accounts.id, accountIds));
            }
            await tx.delete(accountUsers).where(eq(accountUsers.userId, userId));

            if (professionalId) {
                const clientRows = await tx
                    .select({ id: agendaClients.id })
                    .from(agendaClients)
                    .where(eq(agendaClients.professionalId, professionalId));
                const clientIds = clientRows.map((r: { id: string }) => r.id);

                const packRows = await tx
                    .select({ id: agendaPacks.id })
                    .from(agendaPacks)
                    .where(eq(agendaPacks.professionalId, professionalId));
                const packIds = packRows.map((r: { id: string }) => r.id);

                const groupSessionRows = await tx
                    .select({ id: agendaGroupSessions.id })
                    .from(agendaGroupSessions)
                    .where(eq(agendaGroupSessions.professionalId, professionalId));
                const groupSessionIds = groupSessionRows.map((r: { id: string }) => r.id);

                if (clientIds.length > 0) {
                    await tx.delete(agendaClientTagAssignments).where(sql`${agendaClientTagAssignments.clientId} = ANY(${clientIds})`);
                    await tx.delete(agendaClientAttachments).where(sql`${agendaClientAttachments.clientId} = ANY(${clientIds})`);
                    await tx.delete(agendaClientPacks).where(sql`${agendaClientPacks.clientId} = ANY(${clientIds})`);
                }
                if (packIds.length > 0) {
                    await tx.delete(agendaClientPacks).where(sql`${agendaClientPacks.packId} = ANY(${packIds})`);
                }
                if (groupSessionIds.length > 0) {
                    await tx.delete(agendaGroupAttendees).where(sql`${agendaGroupAttendees.sessionId} = ANY(${groupSessionIds})`);
                }

                await tx.delete(agendaGroupSessions).where(eq(agendaGroupSessions.professionalId, professionalId));
                await tx.delete(agendaNpsResponses).where(eq(agendaNpsResponses.professionalId, professionalId));
                await tx.delete(agendaSessionNotes).where(eq(agendaSessionNotes.professionalId, professionalId));
                await tx.delete(agendaPayments).where(eq(agendaPayments.professionalId, professionalId));
                await tx.delete(agendaAppointments).where(eq(agendaAppointments.professionalId, professionalId));
                await tx.delete(agendaReferrals).where(eq(agendaReferrals.professionalId, professionalId));
                await tx.delete(agendaPromotions).where(eq(agendaPromotions.professionalId, professionalId));
                await tx.delete(agendaPacks).where(eq(agendaPacks.professionalId, professionalId));
                await tx.delete(agendaClientTags).where(eq(agendaClientTags.professionalId, professionalId));
                if (clientIds.length > 0) {
                    await tx.delete(agendaClients).where(sql`${agendaClients.id} = ANY(${clientIds})`);
                }
                await tx.delete(agendaBlockedSlots).where(eq(agendaBlockedSlots.professionalId, professionalId));
                await tx.delete(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, professionalId));
                await tx.delete(agendaLocations).where(eq(agendaLocations.professionalId, professionalId));
                await tx.delete(agendaServices).where(eq(agendaServices.professionalId, professionalId));
                await tx.delete(agendaAuditEvents).where(eq(agendaAuditEvents.professionalId, professionalId));
                await tx.delete(agendaNotificationEvents).where(eq(agendaNotificationEvents.professionalId, professionalId));
                await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
                await tx.delete(agendaProfessionalProfiles).where(eq(agendaProfessionalProfiles.id, professionalId));
            }

            if (ownedListingIds.length > 0) {
                await tx.delete(listings).where(sql`${listings.id} = ANY(${ownedListingIds})`);
            }
            await tx.delete(users).where(eq(users.id, userId));
        });

        caches.usersById.delete(userId);
        caches.savedByUser.delete(userId);
        caches.followsByUser.delete(userId);
        caches.boostOrdersByUser.delete(userId);
        caches.addressBookByUser.delete(userId);
        caches.paymentOrdersByUser.delete(userId);
        caches.activeSubscriptionsByUser.delete(userId);
        caches.instagramPublicationsByUser.delete(userId);
        caches.publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'autos'));
        caches.publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'propiedades'));
        caches.publicProfileTeamMembersByUserVertical.delete(publicProfileUserVerticalKey(userId, 'autos'));
        caches.publicProfileTeamMembersByUserVertical.delete(publicProfileUserVerticalKey(userId, 'propiedades'));

        for (const account of instagramAccountRows) {
            caches.instagramAccountByUserVertical.delete(instagramAccountKey(userId, account.vertical));
        }

        for (const [listingId, listing] of caches.listingsById.entries()) {
            if (listing.ownerId === userId) {
                caches.listingsById.delete(listingId);
                caches.listingLeadCountsByListing.delete(listingId);
            }
        }

        for (const [key, profile] of caches.publicProfilesByVerticalSlug.entries()) {
            if (profile.userId === userId) {
                caches.publicProfilesByVerticalSlug.delete(key);
            }
        }

        if (listingMediaUrlsToDelete.length > 0) {
            await deleteStoredMediaUrls(listingMediaUrlsToDelete);
        }
    };
}
