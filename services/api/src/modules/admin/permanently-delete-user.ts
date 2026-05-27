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
        addressBook,
        paymentOrders,
        subscriptions,
        mortgageRates,
        userNotificationLog,
        serenataNotifications,
        serenataProviderGroupMemberInvites,
        serenataGroupInvites,
        serenataProviderGroupApplications,
        serenataProviderGroups,
        serenataGroupServices,
        serenataAvailabilityRules,
        serenataProviderGroupBlockedSlots,
        serenataSavedProviderGroups,
        serenataProviderGroupMembers,
        serenatas,
        serenataOffers,
        serenataGroupMembers,
        serenataMusicians,
        serenataClients,
        serenataOwners,
        serenataGroups,
    } = tables;

    const pushMediaUrl = (urls: string[], value: string | null | undefined) => {
        const trimmed = value?.trim();
        if (trimmed) urls.push(trimmed);
    };

    return async function permanentlyDeleteUser(userId: string): Promise<void> {
        let instagramAccountRows: Array<{ id: string; vertical: string }> = [];
        let listingMediaUrlsToDelete: string[] = [];
        const userMediaUrlsToDelete: string[] = [];

        await db.transaction(async (tx: any) => {
            const [userRow] = await tx
                .select({ avatarUrl: users.avatarUrl })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            pushMediaUrl(userMediaUrlsToDelete, userRow?.avatarUrl);

            if (serenataProviderGroups) {
                const providerMediaRows = await tx
                    .select({
                        logoUrl: serenataProviderGroups.logoUrl,
                        coverUrl: serenataProviderGroups.coverUrl,
                    })
                    .from(serenataProviderGroups)
                    .where(eq(serenataProviderGroups.ownerUserId, userId));
                for (const row of providerMediaRows) {
                    pushMediaUrl(userMediaUrlsToDelete, row.logoUrl);
                    pushMediaUrl(userMediaUrlsToDelete, row.coverUrl);
                }
            }

            if (publicProfiles) {
                const profileMediaRows = await tx
                    .select({
                        avatarImageUrl: publicProfiles.avatarImageUrl,
                        coverImageUrl: publicProfiles.coverImageUrl,
                    })
                    .from(publicProfiles)
                    .where(eq(publicProfiles.userId, userId));
                for (const row of profileMediaRows) {
                    pushMediaUrl(userMediaUrlsToDelete, row.avatarImageUrl);
                    pushMediaUrl(userMediaUrlsToDelete, row.coverImageUrl);
                }
            }

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
                        ownedListingIds.length > 0 ? inArray(listingLeads.listingId, ownedListingIds) : sql`false`,
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
                        listingLeadIds.length > 0 ? inArray(messageThreads.leadId, listingLeadIds) : sql`false`,
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
                await tx.delete(messageEntries).where(inArray(messageEntries.threadId, threadIds));
            }
            await tx.delete(messageEntries).where(eq(messageEntries.senderUserId, userId));
            if (threadIds.length > 0) {
                await tx.delete(messageThreads).where(inArray(messageThreads.id, threadIds));
            }

            if (listingLeadIds.length > 0) {
                await tx.delete(listingLeadActivities).where(inArray(listingLeadActivities.leadId, listingLeadIds));
            }
            await tx.delete(listingLeadActivities).where(eq(listingLeadActivities.actorUserId, userId));
            if (listingLeadIds.length > 0) {
                await tx.delete(listingLeads).where(inArray(listingLeads.id, listingLeadIds));
            }

            if (serviceLeadIds.length > 0) {
                await tx.delete(serviceLeadActivities).where(inArray(serviceLeadActivities.leadId, serviceLeadIds));
            }
            await tx.delete(serviceLeadActivities).where(eq(serviceLeadActivities.actorUserId, userId));
            if (serviceLeadIds.length > 0) {
                await tx.delete(serviceLeads).where(inArray(serviceLeads.id, serviceLeadIds));
            }

            if (instagramAccountIds.length > 0) {
                await tx.delete(instagramPublications).where(inArray(instagramPublications.instagramAccountId, instagramAccountIds));
            }
            await tx.delete(instagramPublications).where(eq(instagramPublications.userId, userId));

            if (ownedListingIds.length > 0) {
                await tx.delete(savedListings).where(inArray(savedListings.listingId, ownedListingIds));
            }
            await tx.delete(savedListings).where(eq(savedListings.userId, userId));
            if (serenataSavedProviderGroups) {
                await tx.delete(serenataSavedProviderGroups).where(eq(serenataSavedProviderGroups.userId, userId));
            }

            if (ownedListingIds.length > 0) {
                await tx.delete(boostOrders).where(inArray(boostOrders.listingId, ownedListingIds));
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

            await tx.delete(addressBook).where(eq(addressBook.userId, userId));
            await tx.delete(paymentOrders).where(eq(paymentOrders.userId, userId));
            await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
            await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

            if (mortgageRates) {
                await tx
                    .update(mortgageRates)
                    .set({ updatedBy: null })
                    .where(eq(mortgageRates.updatedBy, userId));
            }

            if (userNotificationLog) {
                await tx.delete(userNotificationLog).where(eq(userNotificationLog.userId, userId));
            }
            if (serenataNotifications) {
                await tx.delete(serenataNotifications).where(eq(serenataNotifications.userId, userId));
            }
            if (serenataProviderGroupMemberInvites) {
                await tx
                    .delete(serenataProviderGroupMemberInvites)
                    .where(eq(serenataProviderGroupMemberInvites.invitedByUserId, userId));
            }
            if (serenataGroupInvites) {
                await tx.delete(serenataGroupInvites).where(eq(serenataGroupInvites.invitedByUserId, userId));
            }
            if (serenataProviderGroupApplications) {
                await tx
                    .delete(serenataProviderGroupApplications)
                    .where(eq(serenataProviderGroupApplications.userId, userId));
            }

            if (serenataProviderGroups) {
                const ownedProviderGroups = await tx
                    .select({ id: serenataProviderGroups.id })
                    .from(serenataProviderGroups)
                    .where(eq(serenataProviderGroups.ownerUserId, userId));
                const ownedProviderGroupIds = ownedProviderGroups.map((row: { id: string }) => row.id);

                if (ownedProviderGroupIds.length > 0 && serenatas) {
                    const linkedSerenatas = await tx
                        .select({ id: serenatas.id })
                        .from(serenatas)
                        .where(inArray(serenatas.providerGroupId, ownedProviderGroupIds));
                    const linkedSerenataIds = linkedSerenatas.map((row: { id: string }) => row.id);

                    if (linkedSerenataIds.length > 0 && serenataOffers) {
                        await tx
                            .delete(serenataOffers)
                            .where(inArray(serenataOffers.serenataId, linkedSerenataIds));
                    }
                    if (linkedSerenataIds.length > 0) {
                        await tx.delete(serenatas).where(inArray(serenatas.id, linkedSerenataIds));
                    }
                }

                if (ownedProviderGroupIds.length > 0) {
                    if (serenataGroupServices) {
                        await tx
                            .delete(serenataGroupServices)
                            .where(inArray(serenataGroupServices.providerGroupId, ownedProviderGroupIds));
                    }
                    if (serenataAvailabilityRules) {
                        await tx
                            .delete(serenataAvailabilityRules)
                            .where(inArray(serenataAvailabilityRules.providerGroupId, ownedProviderGroupIds));
                    }
                    if (serenataProviderGroupBlockedSlots) {
                        await tx
                            .delete(serenataProviderGroupBlockedSlots)
                            .where(inArray(serenataProviderGroupBlockedSlots.providerGroupId, ownedProviderGroupIds));
                    }
                    if (serenataProviderGroupMembers) {
                        await tx
                            .delete(serenataProviderGroupMembers)
                            .where(inArray(serenataProviderGroupMembers.providerGroupId, ownedProviderGroupIds));
                    }
                    await tx
                        .delete(serenataProviderGroups)
                        .where(inArray(serenataProviderGroups.id, ownedProviderGroupIds));
                }
            }

            if (serenataMusicians) {
                const musicianRows = await tx
                    .select({ id: serenataMusicians.id })
                    .from(serenataMusicians)
                    .where(eq(serenataMusicians.userId, userId));
                const musicianIds = musicianRows.map((row: { id: string }) => row.id);

                if (musicianIds.length > 0) {
                    if (serenataProviderGroupMembers) {
                        await tx
                            .delete(serenataProviderGroupMembers)
                            .where(inArray(serenataProviderGroupMembers.musicianId, musicianIds));
                    }
                    if (serenataGroupMembers) {
                        await tx
                            .delete(serenataGroupMembers)
                            .where(inArray(serenataGroupMembers.musicianId, musicianIds));
                    }
                    await tx.delete(serenataMusicians).where(inArray(serenataMusicians.id, musicianIds));
                }
            }

            if (serenataClients) {
                const clientRows = await tx
                    .select({ id: serenataClients.id })
                    .from(serenataClients)
                    .where(eq(serenataClients.userId, userId));
                const clientIds = clientRows.map((row: { id: string }) => row.id);

                if (clientIds.length > 0 && serenatas) {
                    const clientSerenatas = await tx
                        .select({ id: serenatas.id })
                        .from(serenatas)
                        .where(inArray(serenatas.clientId, clientIds));
                    const clientSerenataIds = clientSerenatas.map((row: { id: string }) => row.id);

                    if (clientSerenataIds.length > 0 && serenataOffers) {
                        await tx
                            .delete(serenataOffers)
                            .where(inArray(serenataOffers.serenataId, clientSerenataIds));
                    }
                    if (clientSerenataIds.length > 0) {
                        await tx.delete(serenatas).where(inArray(serenatas.id, clientSerenataIds));
                    }
                    await tx.delete(serenataClients).where(inArray(serenataClients.id, clientIds));
                }
            }

            if (serenataOwners) {
                const ownerRows = await tx
                    .select({ id: serenataOwners.id })
                    .from(serenataOwners)
                    .where(eq(serenataOwners.userId, userId));
                const ownerIds = ownerRows.map((row: { id: string }) => row.id);

                if (ownerIds.length > 0) {
                    if (serenataGroups) {
                        await tx.delete(serenataGroups).where(inArray(serenataGroups.ownerId, ownerIds));
                    }
                    if (serenataOffers) {
                        await tx.delete(serenataOffers).where(inArray(serenataOffers.ownerId, ownerIds));
                    }
                    if (serenatas) {
                        const ownerSerenatas = await tx
                            .select({ id: serenatas.id })
                            .from(serenatas)
                            .where(inArray(serenatas.ownerId, ownerIds));
                        const ownerSerenataIds = ownerSerenatas.map((row: { id: string }) => row.id);
                        if (ownerSerenataIds.length > 0) {
                            await tx.delete(serenatas).where(inArray(serenatas.id, ownerSerenataIds));
                        }
                    }
                    await tx.delete(serenataOwners).where(inArray(serenataOwners.id, ownerIds));
                }
            }

            if (serenatas) {
                await tx.update(serenatas).set({ completedBy: null }).where(eq(serenatas.completedBy, userId));
                await tx.update(serenatas).set({ cancelledBy: null }).where(eq(serenatas.cancelledBy, userId));
            }

            const accountRows = await tx
                .select({ id: accounts.id })
                .from(accounts)
                .where(eq(accounts.ownerUserId, userId));
            const accountIds = accountRows.map((r: { id: string }) => r.id);

            if (ownedListingIds.length > 0) {
                await tx.delete(listings).where(inArray(listings.id, ownedListingIds));
            }
            if (accountIds.length > 0) {
                await tx.delete(listings).where(inArray(listings.accountId, accountIds));
            }

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
                    await tx.delete(agendaClientTagAssignments).where(inArray(agendaClientTagAssignments.clientId, clientIds));
                    await tx.delete(agendaClientAttachments).where(inArray(agendaClientAttachments.clientId, clientIds));
                    await tx.delete(agendaClientPacks).where(inArray(agendaClientPacks.clientId, clientIds));
                }
                if (packIds.length > 0) {
                    await tx.delete(agendaClientPacks).where(inArray(agendaClientPacks.packId, packIds));
                }
                if (groupSessionIds.length > 0) {
                    await tx.delete(agendaGroupAttendees).where(inArray(agendaGroupAttendees.sessionId, groupSessionIds));
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
                    await tx.delete(agendaClients).where(inArray(agendaClients.id, clientIds));
                }
                await tx.delete(agendaBlockedSlots).where(eq(agendaBlockedSlots.professionalId, professionalId));
                await tx.delete(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, professionalId));
                await tx.delete(agendaLocations).where(eq(agendaLocations.professionalId, professionalId));
                await tx.delete(agendaServices).where(eq(agendaServices.professionalId, professionalId));
                await tx.delete(agendaAuditEvents).where(eq(agendaAuditEvents.professionalId, professionalId));
                await tx.delete(agendaNotificationEvents).where(eq(agendaNotificationEvents.professionalId, professionalId));
                await tx.delete(agendaProfessionalProfiles).where(eq(agendaProfessionalProfiles.id, professionalId));
            }

            if (accountIds.length > 0) {
                if (addressBook) {
                    await tx.delete(addressBook).where(inArray(addressBook.accountId, accountIds));
                }
                await tx.delete(accountUsers).where(inArray(accountUsers.accountId, accountIds));
                await tx.delete(accounts).where(inArray(accounts.id, accountIds));
            }
            await tx.delete(accountUsers).where(eq(accountUsers.userId, userId));

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

        const allMediaUrls = [...listingMediaUrlsToDelete, ...userMediaUrlsToDelete];
        if (allMediaUrls.length > 0) {
            await deleteStoredMediaUrls(allMediaUrls);
        }
    };
}
