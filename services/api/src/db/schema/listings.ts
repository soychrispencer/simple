import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users, accounts } from './users.js';

// Listings table
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades'
  section: varchar('section', { length: 20 }).notNull(), // 'sale' | 'rent' | 'auction' | 'project'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priceLabel: varchar('price_label', { length: 100 }),
  location: varchar('location', { length: 255 }),
  locationData: jsonb('location_data'), // GeoPoint
  hrefSlug: varchar('href_slug', { length: 255 }).unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft' | 'active' | 'paused' | 'sold' | 'archived'
  rawData: jsonb('raw_data').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Saved listings table
export const savedListings = pgTable('saved_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserListing: uniqueIndex('unique_user_listing').on(table.userId, table.listingId),
}));

export const listingDrafts = pgTable('listing_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  draftData: jsonb('draft_data').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVerticalDraft: uniqueIndex('listing_drafts_user_vertical_idx').on(table.userId, table.vertical),
}));

// Follows table
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id).notNull(),
  followeeId: uuid('followee_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades'
  followedAt: timestamp('followed_at').notNull().defaultNow(),
}, (table) => ({
  uniqueFollow: uniqueIndex('unique_follow').on(table.followerId, table.followeeId, table.vertical),
}));

// Boost orders table
export const boostOrders = pgTable('boost_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  listingId: uuid('listing_id').references(() => listings.id),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades'
  section: varchar('section', { length: 20 }).notNull(), // 'sale' | 'rent' | 'auction' | 'project'
  planId: varchar('plan_id', { length: 50 }).notNull(), // 'boost_starter' | 'boost_pro' | 'boost_max'
  days: integer('days').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'), // 'scheduled' | 'active' | 'paused' | 'ended'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
});
