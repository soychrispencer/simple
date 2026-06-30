/**
 * Database schema barrel file.
 *
 * Currently re-exports everything from the monolithic schema.ts.
 * TODO: Split into domain files:
 *   - users.ts (users, userPlatformAccess, passwordResetTokens, emailVerificationTokens)
 *   - accounts.ts (accounts, accountUsers, accountBusinessProfiles)
 *   - listings.ts (listings, savedListings, listingDrafts)
 *   - agenda.ts (agendaProfessionalProfiles, agendaClients, agendaAppointments, ...)
 *   - serenatas.ts (serenataMusicians, serenataProviderGroups, serenataGroupServices, ...)
 *   - payments.ts (subscriptions, paymentOrders, billingPlans)
 *   - social.ts (instagramAccounts, instagramPublications, follows, publicProfiles)
 *   - notifications.ts (notificationEvents, inAppNotifications)
 *   - advertising.ts (adCampaigns, boostOrders)
 *   - messages.ts (messageThreads, messageEntries)
 */
export * from '../schema.js';
