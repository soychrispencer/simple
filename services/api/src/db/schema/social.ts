import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users, accounts } from './users.js';
import { addressBook } from './messages.js';

export const instagramAccounts = pgTable('instagram_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  instagramUserId: varchar('instagram_user_id', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  accountType: varchar('account_type', { length: 50 }),
  profilePictureUrl: text('profile_picture_url'),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: jsonb('scopes'),
  autoPublishEnabled: boolean('auto_publish_enabled').notNull().default(false),
  captionTemplate: text('caption_template'),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  lastSyncedAt: timestamp('last_synced_at'),
  lastPublishedAt: timestamp('last_published_at'),
  lastError: text('last_error'),
  facebookPageId: varchar('facebook_page_id', { length: 255 }),
  facebookPageName: varchar('facebook_page_name', { length: 255 }),
  facebookPageAccessToken: text('facebook_page_access_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('instagram_accounts_user_vertical_idx').on(table.userId, table.vertical),
}));

export const socialPublications = pgTable('social_publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  listingId: varchar('listing_id', { length: 255 }).notNull(),
  listingTitle: varchar('listing_title', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  contentType: varchar('content_type', { length: 20 }).notNull().default('link'),
  externalId: varchar('external_id', { length: 255 }),
  permalink: text('permalink'),
  caption: text('caption').notNull(),
  mediaUrl: text('media_url'),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  errorMessage: text('error_message'),
  sourceUpdatedAt: timestamp('source_updated_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tiktokAccounts = pgTable('tiktok_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  openId: varchar('open_id', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: jsonb('scopes'),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  lastSyncedAt: timestamp('last_synced_at'),
  lastPublishedAt: timestamp('last_published_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('tiktok_accounts_user_vertical_idx').on(table.userId, table.vertical),
}));

export const youtubeAccounts = pgTable('youtube_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  channelId: varchar('channel_id', { length: 255 }).notNull(),
  channelTitle: varchar('channel_title', { length: 255 }).notNull(),
  channelHandle: varchar('channel_handle', { length: 255 }),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: jsonb('scopes'),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  lastSyncedAt: timestamp('last_synced_at'),
  lastPublishedAt: timestamp('last_published_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('youtube_accounts_user_vertical_idx').on(table.userId, table.vertical),
}));

export const instagramPublications = pgTable('instagram_publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  instagramAccountId: uuid('instagram_account_id').references(() => instagramAccounts.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  listingId: varchar('listing_id', { length: 255 }).notNull(),
  listingTitle: varchar('listing_title', { length: 255 }).notNull(),
  instagramMediaId: varchar('instagram_media_id', { length: 255 }),
  instagramPermalink: text('instagram_permalink'),
  caption: text('caption').notNull(),
  imageUrl: text('image_url').notNull(),
  contentType: varchar('content_type', { length: 20 }).notNull().default('carousel'),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  errorMessage: text('error_message'),
  sourceUpdatedAt: timestamp('source_updated_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const publicProfiles = pgTable('public_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  accountKind: varchar('account_kind', { length: 20 }).notNull().default('individual'),
  operatorSubtype: varchar('operator_subtype', { length: 40 }),
  operatorSubtypeCustom: varchar('operator_subtype_custom', { length: 160 }),
  displayName: varchar('display_name', { length: 160 }).notNull(),
  headline: varchar('headline', { length: 180 }),
  bio: text('bio'),
  companyName: varchar('company_name', { length: 160 }),
  website: varchar('website', { length: 500 }),
  publicEmail: varchar('public_email', { length: 255 }),
  publicPhone: varchar('public_phone', { length: 40 }),
  publicWhatsapp: varchar('public_whatsapp', { length: 40 }),
  addressLine: varchar('address_line', { length: 255 }),
  city: varchar('city', { length: 120 }),
  region: varchar('region', { length: 120 }),
  countryCode: varchar('country_code', { length: 3 }).notNull().default('CL'),
  regionId: varchar('region_id', { length: 50 }),
  localityId: varchar('locality_id', { length: 50 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Santiago'),
  primaryAddressId: uuid('primary_address_id').references(() => addressBook.id, { onDelete: 'set null' }),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  avatarImageUrl: varchar('avatar_image_url', { length: 500 }),
  socialLinks: jsonb('social_links').$type<Record<string, string | null>>().notNull().default(sql`'{}'::jsonb`),
  businessHours: jsonb('business_hours').$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  scheduleNote: varchar('schedule_note', { length: 255 }),
  alwaysOpen: boolean('always_open').notNull().default(false),
  weeklyBreakStart: varchar('weekly_break_start', { length: 5 }),
  weeklyBreakEnd: varchar('weekly_break_end', { length: 5 }),
  scheduleBlockedSlots: jsonb('schedule_blocked_slots').$type<Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
  }>>().notNull().default(sql`'[]'::jsonb`),
  requiresAdvancePayment: boolean('requires_advance_payment').notNull().default(false),
  advancePaymentInstructions: text('advance_payment_instructions'),
  acceptsTransfer: boolean('accepts_transfer').notNull().default(false),
  acceptsMp: boolean('accepts_mp').notNull().default(false),
  acceptsPaymentLink: boolean('accepts_payment_link').notNull().default(false),
  paymentLinkUrl: varchar('payment_link_url', { length: 500 }),
  bankTransferData: jsonb('bank_transfer_data').$type<{
    bank: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
    holderEmail: string;
    alias?: string;
  } | null>(),
  mpAccessToken: text('mp_access_token'),
  mpPublicKey: varchar('mp_public_key', { length: 255 }),
  mpUserId: varchar('mp_user_id', { length: 100 }),
  mpRefreshToken: text('mp_refresh_token'),
  bookingTermsText: text('booking_terms_text'),
  trialEndsAt: timestamp('trial_ends_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('public_profiles_user_vertical_idx').on(table.userId, table.vertical),
  uniqueVerticalSlug: uniqueIndex('public_profiles_vertical_slug_idx').on(table.vertical, table.slug),
}));

export const marketplaceOperatorServices = pgTable('marketplace_operator_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicProfileId: uuid('public_profile_id').references(() => publicProfiles.id, { onDelete: 'cascade' }).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  category: varchar('category', { length: 40 }).notNull().default('other'),
  pricingMode: varchar('pricing_mode', { length: 16 }).notNull().default('fixed'),
  price: decimal('price', { precision: 10, scale: 2 }),
  promoPrice: decimal('promo_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  durationMinutes: integer('duration_minutes'),
  color: varchar('color', { length: 20 }),
  isOnline: boolean('is_online').notNull().default(true),
  isPresential: boolean('is_presential').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('marketplace_operator_services_profile_idx').on(table.publicProfileId),
  verticalActiveIdx: index('marketplace_operator_services_vertical_active_idx').on(table.vertical, table.isActive),
}));

export const marketplaceOperatorServicePacks = pgTable('marketplace_operator_service_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicProfileId: uuid('public_profile_id').references(() => publicProfiles.id, { onDelete: 'cascade' }).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  sessionsCount: integer('sessions_count').notNull().default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  promoPrice: decimal('promo_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  validityDays: integer('validity_days'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('marketplace_operator_service_packs_profile_idx').on(table.publicProfileId),
}));

export const marketplaceOperatorServicePromotions = pgTable('marketplace_operator_service_promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicProfileId: uuid('public_profile_id').references(() => publicProfiles.id, { onDelete: 'cascade' }).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  label: varchar('label', { length: 120 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 10 }).notNull().default('percent'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('marketplace_operator_service_promotions_profile_idx').on(table.publicProfileId),
}));
