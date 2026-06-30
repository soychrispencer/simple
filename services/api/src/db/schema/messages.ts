import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users, accounts } from './users.js';
import { listings } from './listings.js';

export const addressBook = pgTable('address_book', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  kind: varchar('kind', { length: 20 }).notNull().default('personal'), // office | clinic | store | branch | company | personal | shipping | billing | warehouse | pickup | delivery | other
  scope: varchar('scope', { length: 20 }).notNull().default('personal'), // personal | business
  vertical: varchar('vertical', { length: 20 }), // autos | propiedades | serenatas (solo scope business)
  label: varchar('label', { length: 100 }).notNull(),
  countryCode: varchar('country_code', { length: 3 }).notNull().default('CL'),
  regionId: varchar('region_id', { length: 50 }),
  regionName: varchar('region_name', { length: 120 }),
  communeId: varchar('commune_id', { length: 50 }),
  communeName: varchar('commune_name', { length: 120 }),
  neighborhood: varchar('neighborhood', { length: 120 }),
  addressLine1: varchar('address_line_1', { length: 255 }),
  addressLine2: varchar('address_line_2', { length: 255 }),
  postalCode: varchar('postal_code', { length: 20 }),
  arrivalInstructions: text('arrival_instructions'),
  isDefault: boolean('is_default').notNull().default(false),
  isPublicVisible: boolean('is_public_visible').notNull().default(false),
  geoPoint: jsonb('geo_point'), // { latitude: number, longitude: number, precision: string }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('address_book_user_id_idx').on(table.userId),
}));


export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  contextType: varchar('context_type', { length: 40 }),
  contextId: uuid('context_id'),
  listingId: uuid('listing_id').references(() => listings.id),
  ownerUserId: uuid('owner_user_id').references(() => users.id).notNull(),
  buyerUserId: uuid('buyer_user_id').references(() => users.id).notNull(),
  ownerUnreadCount: integer('owner_unread_count').notNull().default(0),
  buyerUnreadCount: integer('buyer_unread_count').notNull().default(0),
  ownerArchivedAt: timestamp('owner_archived_at'),
  buyerArchivedAt: timestamp('buyer_archived_at'),
  ownerSpamAt: timestamp('owner_spam_at'),
  buyerSpamAt: timestamp('buyer_spam_at'),
  lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueListingBuyerThread: uniqueIndex('message_threads_listing_buyer_idx')
    .on(table.listingId, table.buyerUserId)
    .where(sql`${table.listingId} is not null`),
  uniqueContextBuyerThread: uniqueIndex('message_threads_context_buyer_idx')
    .on(table.contextType, table.contextId, table.buyerUserId)
    .where(sql`${table.contextType} is not null and ${table.contextId} is not null`),
  contextIdx: index('message_threads_context_idx').on(table.contextType, table.contextId),
}));

export const messageEntries = pgTable('message_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => messageThreads.id).notNull(),
  senderUserId: uuid('sender_user_id').references(() => users.id).notNull(),
  senderRole: varchar('sender_role', { length: 20 }).notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const adCampaigns = pgTable('ad_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  format: varchar('format', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),
  destinationType: varchar('destination_type', { length: 20 }).notNull(),
  destinationUrl: text('destination_url'),
  listingHref: varchar('listing_href', { length: 500 }),
  profileSlug: varchar('profile_slug', { length: 255 }),
  desktopImageDataUrl: text('desktop_image_data_url').notNull(),
  mobileImageDataUrl: text('mobile_image_data_url'),
  overlayEnabled: boolean('overlay_enabled').notNull().default(false),
  overlayTitle: varchar('overlay_title', { length: 160 }),
  overlaySubtitle: text('overlay_subtitle'),
  overlayCta: varchar('overlay_cta', { length: 80 }),
  overlayAlign: varchar('overlay_align', { length: 20 }).notNull().default('left'),
  placementSection: varchar('placement_section', { length: 20 }),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  durationDays: integer('duration_days').notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
