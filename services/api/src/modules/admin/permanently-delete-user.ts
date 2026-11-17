import { and, eq, ne, or, sql, inArray } from 'drizzle-orm';
export type PermanentlyDeleteUserDeps = {
    db: any;
    tables: Record<string, any>;
    extractAllListingMediaUrls: (listing: { rawData?: unknown }) => string[];
    deleteStoredMediaUrls: (urls: string[]) => Promise<void>;
    instagramAccountKey: (userId: string, vertical: string) => string;
    publicProfileUserVerticalKey: (userId: string, vertical: string) => string;
    refreshCaches?: () => Promise<void>;
    caches: {
        usersById: Map<string, unknown>;
        savedByUser: Map<string, unknown>;
        followsByUser: Map<string, unknown>;
        boostOrdersByUser: Map<string, unknown>;
        addressBookByUser: Map<string, unknown>;
        paymentOrdersByUser: Map<string, unknown>;
        activeSubscriptionsByUser: Map<string, unknown>;
        activeSubscriptionsByAccount: Map<string, any[]>;
        instagramPublicationsByUser: Map<string, unknown>;
        socialPublicationsByUser: Map<string, unknown>;
        publicProfilesByUserVertical: Map<string, unknown>;
        publicProfilesByAccountVertical: Map<string, { userId: string }>;
        instagramAccountByUserVertical: Map<string, unknown>;
        tiktokAccountByUserVertical: Map<string, unknown>;
        youtubeAccountByUserVertical: Map<string, unknown>;
        listingsById: Map<string, { accountId?: string | null; ownerId: string }>;
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
        refreshCaches,
        caches,
    } = deps;

    const {
        agendaProfessionalProfiles,
        listings,
        messageThreads,
        messageEntries,
        instagramAccounts,
        instagramPublications,
        socialPublications,
        tiktokAccounts,
        youtubeAccounts,
        savedListings,
        boostOrders,
        adCampaigns,
        listingDrafts,
        follows,
        publicProfiles,
        passwordResetTokens,
        emailVerificationTokens,
        userPlatformAccess,
        accounts,
        accountUsers,
        agendaClients,
        agendaPacks,
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
        agendaAccountVisits,
        accountRelationshipTasks,
        accountRelationshipAssignments,
        accountListingAssignments,
        pushSubscriptions,
        users,
        agendaClientTags,
        addressBook,
        paymentOrders,
        subscriptions,
        mortgageRates,
        userNotificationLog,
        platformNotifications,
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
        const sharedAccountOwners = new Map<string, string>();
        const transferredListingOwners = new Map<string, string>();

        await db.transaction(async (tx: any) => {
            const [userRow] = await tx
                .select({ avatarUrl: users.avatarUrl })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            pushMediaUrl(userMediaUrlsToDelete, userRow?.avatarUrl);

            const ownedAccountRows = await tx
                .select({ id: accounts.id, isPersonal: accounts.isPersonal })
                .from(accounts)
                .where(eq(accounts.ownerUserId, userId));
            const ownedAccountIds = ownedAccountRows.map((row: { id: string }) => row.id);
            if (ownedAccountIds.length > 0) {
                const memberships = await tx
                    .select({ accountId: accountUsers.accountId, userId: accountUsers.userId })
                    .from(accountUsers)
                    .where(inArray(accountUsers.accountId, ownedAccountIds));
                const sharedOwnedAccount = ownedAccountRows.find((account: { id: string; isPersonal: boolean }) =>
                    !account.isPersonal && memberships.some((membership: { accountId: string; userId: string }) =>
                        membership.accountId === account.id && membership.userId !== userId,
                    ),
                );
                if (sharedOwnedAccount) {
                    throw new Error('Antes de eliminar a esta persona, transfiere la propiedad del espacio empresarial desde su panel de equipo.');
                }
            }

            const sharedWorkspaces = await tx
                .select({ id: accounts.id, ownerUserId: accounts.ownerUserId })
                .from(accounts)
                .innerJoin(accountUsers, eq(accountUsers.accountId, accounts.id))
                .where(and(
                    eq(accountUsers.userId, userId),
                    eq(accounts.isPersonal, false),
                    ne(accounts.ownerUserId, userId),
                ));
            for (const workspace of sharedWorkspaces as Array<{ id: string; ownerUserId: string }>) {
                sharedAccountOwners.set(workspace.id, workspace.ownerUserId);

                const workspaceListings = await tx
                    .select({ id: listings.id })
                    .from(listings)
                    .where(and(eq(listings.accountId, workspace.id), eq(listings.ownerId, userId)));
                for (const listing of workspaceListings as Array<{ id: string }>) {
                    transferredListingOwners.set(listing.id, workspace.ownerUserId);
                }
                await tx.update(listings)
                    .set({ ownerId: workspace.ownerUserId })
                    .where(and(eq(listings.accountId, workspace.id), eq(listings.ownerId, userId)));

                const transferAccountUserRows = async (table: any) => {
                    if (!table?.accountId || !table?.userId) return;
                    await tx.update(table)
                        .set({ userId: workspace.ownerUserId })
                        .where(and(eq(table.accountId, workspace.id), eq(table.userId, userId)));
                };

                for (const table of [
                    publicProfiles,
                    boostOrders,
                    adCampaigns,
                    listingDrafts,
                    instagramAccounts,
                    instagramPublications,
                    socialPublications,
                    tiktokAccounts,
                    youtubeAccounts,
                    subscriptions,
                    paymentOrders,
                ]) {
                    await transferAccountUserRows(table);
                }

                if (addressBook) {
                    await tx.update(addressBook)
                        .set({ userId: workspace.ownerUserId })
                        .where(and(
                            eq(addressBook.accountId, workspace.id),
                            eq(addressBook.userId, userId),
                            eq(addressBook.scope, 'business'),
                        ));
                }

                if (agendaAccountVisits) {
                    await tx.update(agendaAccountVisits)
                        .set({ createdByUserId: workspace.ownerUserId })
                        .where(and(eq(agendaAccountVisits.accountId, workspace.id), eq(agendaAccountVisits.createdByUserId, userId)));
                    await tx.update(agendaAccountVisits)
                        .set({ assignedUserId: workspace.ownerUserId })
                        .where(and(eq(agendaAccountVisits.accountId, workspace.id), eq(agendaAccountVisits.assignedUserId, userId)));
                }
                if (accountRelationshipTasks) {
                    await tx.update(accountRelationshipTasks)
                        .set({ createdByUserId: workspace.ownerUserId })
                        .where(and(eq(accountRelationshipTasks.accountId, workspace.id), eq(accountRelationshipTasks.createdByUserId, userId)));
                    await tx.update(accountRelationshipTasks)
                        .set({ assignedUserId: workspace.ownerUserId })
                        .where(and(eq(accountRelationshipTasks.accountId, workspace.id), eq(accountRelationshipTasks.assignedUserId, userId)));
                }
                if (accountRelationshipAssignments) {
                    await tx.update(accountRelationshipAssignments)
                        .set({ assignedUserId: workspace.ownerUserId })
                        .where(and(eq(accountRelationshipAssignments.accountId, workspace.id), eq(accountRelationshipAssignments.assignedUserId, userId)));
                    await tx.update(accountRelationshipAssignments)
                        .set({ assignedByUserId: null })
                        .where(and(eq(accountRelationshipAssignments.accountId, workspace.id), eq(accountRelationshipAssignments.assignedByUserId, userId)));
                }
                // Listing assignments belong to a person. Removing the departing
                // member's assignments keeps the listing while leaving it available
                // for the workspace owner to assign again.
                if (accountListingAssignments) {
                    await tx.delete(accountListingAssignments)
                        .where(and(eq(accountListingAssignments.accountId, workspace.id), eq(accountListingAssignments.assignedUserId, userId)));
                    await tx.update(accountListingAssignments)
                        .set({ assignedByUserId: null })
                        .where(and(eq(accountListingAssignments.accountId, workspace.id), eq(accountListingAssignments.assignedByUserId, userId)));
                }
            }

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

            const agendaProfileRows = await tx
                .select({
                    id: agendaProfessionalProfiles.id,
                    avatarUrl: agendaProfessionalProfiles.avatarUrl,
                    coverUrl: agendaProfessionalProfiles.coverUrl,
                })
                .from(agendaProfessionalProfiles)
                .where(ownedAccountIds.length > 0
                    ? or(
                        eq(agendaProfessionalProfiles.userId, userId),
                        inArray(agendaProfessionalProfiles.accountId, ownedAccountIds),
                    )
                    : eq(agendaProfessionalProfiles.userId, userId));
            const professionalIds = agendaProfileRows.map((row: { id: string }) => row.id);
            for (const profile of agendaProfileRows as Array<{ avatarUrl: string | null; coverUrl: string | null }>) {
                pushMediaUrl(userMediaUrlsToDelete, profile.avatarUrl);
                pushMediaUrl(userMediaUrlsToDelete, profile.coverUrl);
            }

            const ownedListings = await tx
                .select({ id: listings.id, accountId: listings.accountId, rawData: listings.rawData })
                .from(listings)
                .where(eq(listings.ownerId, userId));
            const ownedAccountListings = ownedAccountIds.length > 0
                ? await tx
                    .select({ id: listings.id, rawData: listings.rawData })
                    .from(listings)
                    .where(inArray(listings.accountId, ownedAccountIds))
                : [];
            const ownedListingIds = [...new Set([
                ...ownedListings.map((item: { id: string }) => item.id),
                ...ownedAccountListings.map((item: { id: string }) => item.id),
            ])];
            listingMediaUrlsToDelete = [
                ...ownedListings.flatMap((item: { rawData: unknown }) => extractAllListingMediaUrls(item)),
                ...ownedAccountListings.flatMap((item: { rawData: unknown }) => extractAllListingMediaUrls(item)),
            ];

            const threadRows = await tx
                .select({
                    id: messageThreads.id,
                    accountId: messageThreads.accountId,
                    ownerUserId: messageThreads.ownerUserId,
                    buyerUserId: messageThreads.buyerUserId,
                })
                .from(messageThreads)
                .where(ownedAccountIds.length > 0
                    ? or(
                        eq(messageThreads.ownerUserId, userId),
                        eq(messageThreads.buyerUserId, userId),
                        inArray(messageThreads.accountId, ownedAccountIds),
                    )
                    : or(
                        eq(messageThreads.ownerUserId, userId),
                        eq(messageThreads.buyerUserId, userId),
                    ));
            const retainedThreadIds: string[] = [];
            const deletedThreadIds: string[] = [];
            for (const thread of threadRows as Array<{
                id: string;
                accountId: string | null;
                ownerUserId: string;
                buyerUserId: string;
            }>) {
                const replacementOwnerId = thread.accountId ? sharedAccountOwners.get(thread.accountId) : undefined;
                if (replacementOwnerId && thread.ownerUserId === userId && thread.buyerUserId !== userId) {
                    retainedThreadIds.push(thread.id);
                    await tx.update(messageThreads)
                        .set({ ownerUserId: replacementOwnerId })
                        .where(eq(messageThreads.id, thread.id));
                } else {
                    deletedThreadIds.push(thread.id);
                }
            }

            instagramAccountRows = await tx
                .select({ id: instagramAccounts.id, vertical: instagramAccounts.vertical })
                .from(instagramAccounts)
                .where(eq(instagramAccounts.userId, userId));
            const instagramAccountIds = instagramAccountRows.map((item) => item.id);

            if (retainedThreadIds.length > 0) {
                await tx.update(messageEntries)
                    .set({ senderUserId: null })
                    .where(and(
                        inArray(messageEntries.threadId, retainedThreadIds),
                        eq(messageEntries.senderUserId, userId),
                    ));
            }
            if (deletedThreadIds.length > 0) {
                await tx.delete(messageEntries).where(inArray(messageEntries.threadId, deletedThreadIds));
                await tx.delete(messageThreads).where(inArray(messageThreads.id, deletedThreadIds));
            }

            if (instagramAccountIds.length > 0) {
                await tx.delete(instagramPublications).where(inArray(instagramPublications.instagramAccountId, instagramAccountIds));
            }
            await tx.delete(instagramPublications).where(eq(instagramPublications.userId, userId));
            if (socialPublications) {
                await tx.delete(socialPublications).where(eq(socialPublications.userId, userId));
            }

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
            await tx.delete(publicProfiles).where(eq(publicProfiles.userId, userId));
            await tx.delete(instagramAccounts).where(eq(instagramAccounts.userId, userId));
            if (tiktokAccounts) {
                await tx.delete(tiktokAccounts).where(eq(tiktokAccounts.userId, userId));
            }
            if (youtubeAccounts) {
                await tx.delete(youtubeAccounts).where(eq(youtubeAccounts.userId, userId));
            }
            await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
            await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
            if (userPlatformAccess) {
                await tx.delete(userPlatformAccess).where(eq(userPlatformAccess.userId, userId));
            }

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
            if (platformNotifications) {
                await tx.delete(platformNotifications).where(eq(platformNotifications.userId, userId));
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

            if (accountIds.length > 0) {
                if (publicProfiles) {
                    const accountProfileMedia = await tx
                        .select({ avatarImageUrl: publicProfiles.avatarImageUrl, coverImageUrl: publicProfiles.coverImageUrl })
                        .from(publicProfiles)
                        .where(inArray(publicProfiles.accountId, accountIds));
                    for (const profile of accountProfileMedia) {
                        pushMediaUrl(userMediaUrlsToDelete, profile.avatarImageUrl);
                        pushMediaUrl(userMediaUrlsToDelete, profile.coverImageUrl);
                    }
                    await tx.delete(publicProfiles).where(inArray(publicProfiles.accountId, accountIds));
                }
                if (instagramPublications) {
                    await tx.delete(instagramPublications).where(inArray(instagramPublications.accountId, accountIds));
                }
                if (socialPublications) {
                    await tx.delete(socialPublications).where(inArray(socialPublications.accountId, accountIds));
                }
                if (instagramAccounts) {
                    await tx.delete(instagramAccounts).where(inArray(instagramAccounts.accountId, accountIds));
                }
                if (tiktokAccounts) {
                    await tx.delete(tiktokAccounts).where(inArray(tiktokAccounts.accountId, accountIds));
                }
                if (youtubeAccounts) {
                    await tx.delete(youtubeAccounts).where(inArray(youtubeAccounts.accountId, accountIds));
                }
                if (boostOrders) {
                    await tx.delete(boostOrders).where(inArray(boostOrders.accountId, accountIds));
                }
                if (adCampaigns) {
                    await tx.delete(adCampaigns).where(inArray(adCampaigns.accountId, accountIds));
                }
                if (listingDrafts) {
                    await tx.delete(listingDrafts).where(inArray(listingDrafts.accountId, accountIds));
                }
                if (paymentOrders) {
                    await tx.delete(paymentOrders).where(inArray(paymentOrders.accountId, accountIds));
                }
                if (subscriptions) {
                    await tx.delete(subscriptions).where(inArray(subscriptions.accountId, accountIds));
                }
                if (pushSubscriptions) {
                    await tx.delete(pushSubscriptions).where(inArray(pushSubscriptions.accountId, accountIds));
                }
                if (agendaAccountVisits) {
                    await tx.delete(agendaAccountVisits).where(inArray(agendaAccountVisits.accountId, accountIds));
                }
                if (accountRelationshipTasks) {
                    await tx.delete(accountRelationshipTasks).where(inArray(accountRelationshipTasks.accountId, accountIds));
                }
                if (accountRelationshipAssignments) {
                    await tx.delete(accountRelationshipAssignments).where(inArray(accountRelationshipAssignments.accountId, accountIds));
                }
                if (accountListingAssignments) {
                    await tx.delete(accountListingAssignments).where(inArray(accountListingAssignments.accountId, accountIds));
                }
            }

            if (ownedListingIds.length > 0) {
                await tx.delete(listings).where(inArray(listings.id, ownedListingIds));
            }
            if (accountIds.length > 0) {
                await tx.delete(listings).where(inArray(listings.accountId, accountIds));
            }

            if (professionalIds.length > 0) {
                for (const professionalId of professionalIds) {
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

                    if (clientIds.length > 0) {
                        await tx.delete(agendaClientTagAssignments).where(inArray(agendaClientTagAssignments.clientId, clientIds));
                        await tx.delete(agendaClientAttachments).where(inArray(agendaClientAttachments.clientId, clientIds));
                        await tx.delete(agendaClientPacks).where(inArray(agendaClientPacks.clientId, clientIds));
                    }
                    if (packIds.length > 0) {
                        await tx.delete(agendaClientPacks).where(inArray(agendaClientPacks.packId, packIds));
                    }
                    await tx.delete(agendaGroupAttendees).where(eq(agendaGroupAttendees.professionalId, professionalId));

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

        if (refreshCaches) {
            try {
                await refreshCaches();
            } catch (error) {
                console.error('[admin] cache refresh after user deletion failed', { userId, error });
            }
        }

        caches.usersById.delete(userId);
        caches.savedByUser.delete(userId);
        caches.followsByUser.delete(userId);
        caches.boostOrdersByUser.delete(userId);
        caches.addressBookByUser.delete(userId);
        caches.paymentOrdersByUser.delete(userId);
        caches.activeSubscriptionsByUser.delete(userId);
        for (const [accountId, subscriptions] of caches.activeSubscriptionsByAccount.entries()) {
            const remaining = subscriptions.filter((subscription) => subscription.userId !== userId);
            if (remaining.length > 0) caches.activeSubscriptionsByAccount.set(accountId, remaining);
            else caches.activeSubscriptionsByAccount.delete(accountId);
        }
        caches.instagramPublicationsByUser.delete(userId);
        caches.socialPublicationsByUser.delete(userId);
        caches.publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'autos'));
        caches.publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'propiedades'));
        for (const [key, profile] of caches.publicProfilesByAccountVertical.entries()) {
            if (profile.userId !== userId) continue;
            const ownerId = sharedAccountOwners.get((profile as any).accountId ?? '');
            if (ownerId) (profile as any).userId = ownerId;
            else caches.publicProfilesByAccountVertical.delete(key);
        }

        const reconcileIntegrationCache = (cache: Map<string, unknown>) => {
            for (const [key, value] of cache.entries()) {
                const account = value as any;
                if (!account || typeof account.vertical !== 'string') continue;
                if (key === instagramAccountKey(userId, account.vertical)) {
                    cache.delete(key);
                    continue;
                }
                if (account.userId !== userId) continue;
                const replacementOwnerId = sharedAccountOwners.get(account.accountId ?? '');
                if (replacementOwnerId) account.userId = replacementOwnerId;
                else cache.delete(key);
            }
        };
        reconcileIntegrationCache(caches.instagramAccountByUserVertical);
        reconcileIntegrationCache(caches.tiktokAccountByUserVertical);
        reconcileIntegrationCache(caches.youtubeAccountByUserVertical);

        for (const [listingId, listing] of caches.listingsById.entries()) {
            if (listing.ownerId === userId) {
                const ownerId = transferredListingOwners.get(listingId)
                    ?? (listing.accountId ? sharedAccountOwners.get(listing.accountId) : undefined);
                if (ownerId) listing.ownerId = ownerId;
                else caches.listingsById.delete(listingId);
            }
        }

        for (const [key, profile] of caches.publicProfilesByVerticalSlug.entries()) {
            if (profile.userId === userId) {
                const ownerId = sharedAccountOwners.get((profile as any).accountId ?? '');
                if (ownerId) profile.userId = ownerId;
                else caches.publicProfilesByVerticalSlug.delete(key);
            }
        }

        const allMediaUrls = [...new Set([...listingMediaUrlsToDelete, ...userMediaUrlsToDelete])];
        if (allMediaUrls.length > 0) {
            await deleteStoredMediaUrls(allMediaUrls);
        }
    };
}
