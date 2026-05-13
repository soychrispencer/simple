import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
    accounts,
    accountUsers,
    addressBook,
    agendaAppointments,
    agendaClients,
    agendaProfessionalProfiles,
    listings,
    listingLeads,
    messageThreads,
    publicProfiles,
    subscriptions,
    users,
} from '../../db/schema.js';

export type DbUser = InferSelectModel<typeof users>;
export type NewDbUser = InferInsertModel<typeof users>;
export type DbAccount = InferSelectModel<typeof accounts>;
export type NewDbAccount = InferInsertModel<typeof accounts>;
export type DbAccountUser = InferSelectModel<typeof accountUsers>;
export type DbListing = InferSelectModel<typeof listings>;
export type DbListingLead = InferSelectModel<typeof listingLeads>;
export type DbMessageThread = InferSelectModel<typeof messageThreads>;
export type DbPublicProfile = InferSelectModel<typeof publicProfiles>;
export type DbAddressBookEntry = InferSelectModel<typeof addressBook>;
export type DbAgendaProfile = InferSelectModel<typeof agendaProfessionalProfiles>;
export type DbAgendaClient = InferSelectModel<typeof agendaClients>;
export type DbAgendaAppointment = InferSelectModel<typeof agendaAppointments>;
export type DbSubscription = InferSelectModel<typeof subscriptions>;
