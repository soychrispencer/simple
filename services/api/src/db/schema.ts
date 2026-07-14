import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index, primaryKey } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  emailNotifyInvitations: boolean('email_notify_invitations').notNull().default(true),
  emailNotifyRequests: boolean('email_notify_requests').notNull().default(true),
  emailNotifyAgenda: boolean('email_notify_agenda').notNull().default(true),
  emailNotifyAccount: boolean('email_notify_account').notNull().default(true),
  inAppNotificationsEnabled: boolean('in_app_notifications_enabled').notNull().default(true),
  lastNotificationEmailAt: timestamp('last_notification_email_at'),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'musician' | 'client' | 'admin' | 'superadmin'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'verified' | 'suspended'
  primaryVertical: varchar('primary_vertical', { length: 20 }), // NULL = platform/superadmin; 'autos' | 'propiedades' | 'agenda'
  signupApp: varchar('signup_app', { length: 40 }),
  signupOrigin: varchar('signup_origin', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Santiago'),
  dstEnabled: boolean('dst_enabled').notNull().default(false),
  residenceCountryCode: varchar('residence_country_code', { length: 3 }).notNull().default('CL'),
  residenceRegionId: varchar('residence_region_id', { length: 50 }),
  residenceRegionName: varchar('residence_region_name', { length: 120 }),
  residenceLocalityId: varchar('residence_locality_id', { length: 50 }),
  residenceLocalityName: varchar('residence_locality_name', { length: 120 }),
  // OAuth fields
  provider: varchar('provider', { length: 20 }), // 'local' | 'google' | 'facebook' | etc.
  providerId: varchar('provider_id', { length: 255 }), // ID from OAuth provider
  pendingEmail: varchar('pending_email', { length: 255 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  googleCalendarAccessToken: text('google_calendar_access_token'),
  googleCalendarRefreshToken: text('google_calendar_refresh_token'),
  googleCalendarTokenExpiry: timestamp('google_calendar_token_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),
  type: varchar('type', { length: 30 }).notNull().default('general'),
  ownerUserId: uuid('owner_user_id').references(() => users.id).notNull(),
  isPersonal: boolean('is_personal').notNull().default(true),
  businessLegalName: varchar('business_legal_name', { length: 200 }),
  businessTaxId: varchar('business_tax_id', { length: 20 }),
  billingAddressId: uuid('billing_address_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('accounts_owner_idx').on(table.ownerUserId),
}));

export const accountUsers = pgTable('account_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueAccountUser: uniqueIndex('account_users_account_user_idx').on(table.accountId, table.userId),
  userIdx: index('account_users_user_idx').on(table.userId),
  accountIdx: index('account_users_account_idx').on(table.accountId),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueTokenHash: uniqueIndex('password_reset_tokens_token_hash_idx').on(table.tokenHash),
}));

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueTokenHash: uniqueIndex('email_verification_tokens_token_hash_idx').on(table.tokenHash),
}));

export const userPlatformAccess = pgTable('user_platform_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  app: varchar('app', { length: 40 }).notNull(),
  role: varchar('role', { length: 40 }).notNull().default('user'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  origin: varchar('origin', { length: 255 }),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  activatedAt: timestamp('activated_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserApp: uniqueIndex('user_platform_access_user_app_idx').on(table.userId, table.app),
  userIdx: index('user_platform_access_user_idx').on(table.userId),
  appIdx: index('user_platform_access_app_idx').on(table.app),
  statusIdx: index('user_platform_access_status_idx').on(table.status),
}));

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
  targetType: varchar('target_type', { length: 32 }).notNull().default('listing'),
  targetId: uuid('target_id'),
  listingId: uuid('listing_id'),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  section: varchar('section', { length: 20 }).notNull(),
  planId: varchar('plan_id', { length: 50 }).notNull(), // 'boost_starter' | 'boost_pro' | 'boost_max'
  days: integer('days').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'), // 'scheduled' | 'active' | 'paused' | 'ended'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
});

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
  publishStyle: jsonb('publish_style').$type<Record<string, unknown> | null>(),
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

export const marketplaceOperatorProducts = pgTable('marketplace_operator_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicProfileId: uuid('public_profile_id').references(() => publicProfiles.id, { onDelete: 'cascade' }).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  category: varchar('category', { length: 40 }).notNull().default('other'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  promoPrice: decimal('promo_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  stock: integer('stock'),
  sku: varchar('sku', { length: 80 }),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  profileIdx: index('marketplace_operator_products_profile_idx').on(table.publicProfileId),
  verticalActiveIdx: index('marketplace_operator_products_vertical_active_idx').on(table.vertical, table.isActive),
}));

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

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda tables
// ─────────────────────────────────────────────────────────────────────────────

// Professional profile — one per user (the practitioner using SimpleAgenda)
export const agendaProfessionalProfiles = pgTable('agenda_professional_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(), // e.g. "dra-maria-gonzalez"
  isPublished: boolean('is_published').notNull().default(false),
  profession: varchar('profession', { length: 100 }), // e.g. "Psicóloga", "Nutricionista"
  accountKind: varchar('account_kind', { length: 20 }).notNull().default('individual'),
  operatorSubtype: varchar('operator_subtype', { length: 40 }),
  displayName: varchar('display_name', { length: 160 }),
  headline: varchar('headline', { length: 255 }),
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  coverUrl: varchar('cover_url', { length: 500 }),
  publicEmail: varchar('public_email', { length: 255 }),
  publicPhone: varchar('public_phone', { length: 30 }),
  publicWhatsapp: varchar('public_whatsapp', { length: 30 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  address: varchar('address', { length: 255 }),
  countryCode: varchar('country_code', { length: 3 }).notNull().default('CL'),
  regionId: varchar('region_id', { length: 50 }),
  localityId: varchar('locality_id', { length: 50 }),
  serviceLocalities: jsonb('service_localities').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  servesOnline: boolean('serves_online').notNull().default(true),
  servesPresential: boolean('serves_presential').notNull().default(false),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Santiago'),
  bookingWindowDays: integer('booking_window_days').notNull().default(30), // how far in advance clients can book
  cancellationHours: integer('cancellation_hours').notNull().default(24),  // min hours notice to cancel
  confirmationMode: varchar('confirmation_mode', { length: 20 }).notNull().default('auto'), // 'auto' | 'manual'
  allowsRecurrentBooking: boolean('allows_recurrent_booking').notNull().default(true), // patient can book a recurring series publicly
  alwaysOpen: boolean('always_open').notNull().default(false),
  scheduleNote: varchar('schedule_note', { length: 255 }),
  // Encuadre & advance payment
  encuadre: text('encuadre'), // Policy text shown to client at booking (e.g. no-show = no refund)
  requiresAdvancePayment: boolean('requires_advance_payment').notNull().default(false),
  advancePaymentInstructions: text('advance_payment_instructions'), // Bank transfer info, etc.
  // WhatsApp notification preferences
  // Google Calendar integration
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: timestamp('google_token_expiry'),
  // MercadoPago OAuth (professional's own account)
  mpAccessToken: text('mp_access_token'),
  mpPublicKey: varchar('mp_public_key', { length: 255 }),
  mpUserId: varchar('mp_user_id', { length: 100 }),
  mpRefreshToken: text('mp_refresh_token'),
  // Active payment methods (which ones the professional has enabled)
  acceptsTransfer: boolean('accepts_transfer').notNull().default(false),
  acceptsMp: boolean('accepts_mp').notNull().default(false),
  acceptsPaymentLink: boolean('accepts_payment_link').notNull().default(false),
  // Payment link (any URL)
  paymentLinkUrl: varchar('payment_link_url', { length: 500 }),
  // Bank transfer (structured jsonb)
  bankTransferData: jsonb('bank_transfer_data').$type<{
    bank: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
    holderEmail: string;
    alias?: string;
  } | null>(),
  // Social media links
  websiteUrl: varchar('website_url', { length: 500 }),
  instagramUrl: varchar('instagram_url', { length: 500 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  tiktokUrl: varchar('tiktok_url', { length: 500 }),
  youtubeUrl: varchar('youtube_url', { length: 500 }),
  twitterUrl: varchar('twitter_url', { length: 500 }),
  // Notifications
  notificationsLastSeenAt: timestamp('notifications_last_seen_at'),
  // Subscription plan
  plan: varchar('plan', { length: 20 }).notNull().default('free'), // 'free' | 'pro'
  planExpiresAt: timestamp('plan_expires_at'),
  operatorSiteLayout: varchar('operator_site_layout', { length: 20 }).notNull().default('booking'),
  operatorSiteColorMode: varchar('operator_site_color_mode', { length: 10 }).notNull().default('system'),
  operatorSiteAccentColor: varchar('operator_site_accent_color', { length: 20 }).notNull().default('teal'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSlug: uniqueIndex('agenda_profiles_slug_idx').on(table.slug),
  uniqueUser: uniqueIndex('agenda_profiles_user_id_idx').on(table.userId),
}));

// Services / session types offered by the professional
export const agendaServices = pgTable('agenda_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  name: varchar('name', { length: 160 }).notNull(), // e.g. "Consulta individual"
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  isOnline: boolean('is_online').notNull().default(true),
  isPresential: boolean('is_presential').notNull().default(false),
  color: varchar('color', { length: 20 }), // for calendar UI differentiation
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  preconsultFields: jsonb('preconsult_fields').$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  kind: varchar('kind', { length: 20 }).notNull().default('appointment'),
  capacity: integer('capacity'),
  startsAt: timestamp('starts_at'),
  location: text('location'),
  meetingUrl: text('meeting_url'),
  sessionStatus: varchar('session_status', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_services_professional_idx').on(table.professionalId),
}));

// Weekly availability rules (e.g. Mon-Fri 9:00-18:00 with 13:00-14:00 break)
export const agendaAvailabilityRules = pgTable('agenda_availability_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 1=Monday ... 6=Saturday
  startTime: varchar('start_time', { length: 5 }).notNull(), // "09:00"
  endTime: varchar('end_time', { length: 5 }).notNull(),     // "18:00"
  breakStart: varchar('break_start', { length: 5 }), // "13:00" optional
  breakEnd: varchar('break_end', { length: 5 }),     // "14:00" optional
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_availability_professional_idx').on(table.professionalId),
}));

// Consulting locations (offices / rooms where the professional attends in-person)
export const agendaLocations = pgTable('agenda_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  name: varchar('name', { length: 160 }).notNull(), // e.g. "Consulta Providencia"
  addressLine: varchar('address_line', { length: 255 }).notNull(), // street + number
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  notes: text('notes'), // e.g. "Tocar timbre piso 3, estacionamiento disponible"
  googleMapsUrl: varchar('google_maps_url', { length: 500 }),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_locations_professional_idx').on(table.professionalId),
}));

// Manual blocked slots (vacations, personal time, one-off blocks)
export const agendaBlockedSlots = pgTable('agenda_blocked_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  reason: varchar('reason', { length: 255 }), // internal label, not shown to clients
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_blocked_slots_professional_idx').on(table.professionalId),
}));

// Clients / patients managed by the professional
export const agendaClients = pgTable('agenda_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  whatsapp: varchar('whatsapp', { length: 30 }),
  rut: varchar('rut', { length: 20 }), // Chilean national ID
  dateOfBirth: varchar('date_of_birth', { length: 10 }), // ISO date "YYYY-MM-DD"
  gender: varchar('gender', { length: 20 }),
  occupation: varchar('occupation', { length: 100 }),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 100 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 160 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  referredBy: varchar('referred_by', { length: 160 }),
  referredByClientId: uuid('referred_by_client_id'),
  internalNotes: text('internal_notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'inactive' | 'archived'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_clients_professional_idx').on(table.professionalId),
}));

// Clinical attachments (documents, images, prescriptions) tied to a client
export const agendaClientAttachments = pgTable('agenda_client_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  clientId: uuid('client_id').references(() => agendaClients.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 120 }),
  sizeBytes: integer('size_bytes'),
  kind: varchar('kind', { length: 20 }).notNull().default('document'), // 'document' | 'image' | 'prescription' | 'other'
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
}, (table) => ({
  clientIdx: index('agenda_client_attachments_client_idx').on(table.clientId),
  professionalIdx: index('agenda_client_attachments_professional_idx').on(table.professionalId),
}));

// Mortgage rates table - for automatic updates
export const mortgageRates = pgTable('mortgage_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Rate types
  standardRate: decimal('standard_rate', { precision: 5, scale: 2 }).notNull().default('5.50'), // Standard market rate
  subsidyRate: decimal('subsidy_rate', { precision: 5, scale: 2 }).notNull().default('4.19'), // With subsidy (BancoEstado)
  bestMarketRate: decimal('best_market_rate', { precision: 5, scale: 2 }).notNull().default('3.39'), // Best available (Itau)
  highestRate: decimal('highest_rate', { precision: 5, scale: 2 }).notNull().default('5.50'), // Highest market rate
  // Metadata
  sourceUrl: text('source_url'), // Source of the data
  sourceName: varchar('source_name', { length: 100 }).notNull().default('Neat Pagos'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'), // Admin notes about the update
}, (table) => ({
  activeIdx: index('mortgage_rates_active_idx').on(table.isActive),
  updatedAtIdx: index('mortgage_rates_updated_at_idx').on(table.updatedAt),
}));

// Platform admin — audit trail for sensitive actions (SimpleAdmin)
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 120 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  actorIdx: index('admin_audit_logs_actor_idx').on(table.actorUserId),
  entityIdx: index('admin_audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('admin_audit_logs_created_at_idx').on(table.createdAt),
}));

// Appointments / bookings
export const agendaAppointments = pgTable('agenda_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  serviceId: uuid('service_id').references(() => agendaServices.id),
  clientId: uuid('client_id').references(() => agendaClients.id),
  // Client info for walk-ins / public booking (may not have a client record yet)
  clientName: varchar('client_name', { length: 160 }),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 30 }),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  modality: varchar('modality', { length: 20 }).notNull().default('online'), // 'online' | 'presential'
  meetingUrl: varchar('meeting_url', { length: 500 }), // Zoom/Meet link
  location: varchar('location', { length: 255 }), // for presential
  status: varchar('status', { length: 20 }).notNull().default('confirmed'), // 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  internalNotes: text('internal_notes'),
  clientNotes: text('client_notes'), // message from client at booking time
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: varchar('cancelled_by', { length: 20 }), // 'professional' | 'client'
  cancellationReason: text('cancellation_reason'),
  reminderSentAt: timestamp('reminder_sent_at'),       // 24h reminder
  reminder30minSentAt: timestamp('reminder_30min_sent_at'), // 30min reminder
  // Policy agreement (encuadre)
  policyAgreed: boolean('policy_agreed').notNull().default(false),
  policyAgreedAt: timestamp('policy_agreed_at'),
  // Google Calendar
  googleEventId: varchar('google_event_id', { length: 255 }),
  // Payment tracking
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('not_required'), // 'not_required' | 'pending' | 'paid' | 'refunded'
  // Recurrence — groups occurrences of the same booked series
  seriesId: uuid('series_id'),
  recurrenceFrequency: varchar('recurrence_frequency', { length: 20 }), // 'weekly' | 'biweekly' | 'monthly' | null
  // Pre-consulta snapshot: array of { label, value }
  preconsultResponses: jsonb('preconsult_responses').$type<Array<{ label: string; value: string }>>(),
  // Promotion / cupón aplicado
  promotionId: uuid('promotion_id'),
  promotionCode: varchar('promotion_code', { length: 40 }),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  // Pack/bono consumido
  clientPackId: uuid('client_pack_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_appointments_professional_idx').on(table.professionalId),
  startsAtIdx: index('agenda_appointments_starts_at_idx').on(table.startsAt),
  clientIdx: index('agenda_appointments_client_idx').on(table.clientId),
  seriesIdx: index('agenda_appointments_series_idx').on(table.seriesId),
  promotionIdx: index('agenda_appointments_promotion_idx').on(table.promotionId),
  clientPackIdx: index('agenda_appointments_client_pack_idx').on(table.clientPackId),
}));

// Session notes (clinical notes per appointment)
export const agendaSessionNotes = pgTable('agenda_session_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => agendaAppointments.id).notNull(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  clientId: uuid('client_id').references(() => agendaClients.id),
  content: text('content').notNull(),
  rawData: jsonb('raw_data'), // structured fields if needed per profession
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueAppointment: uniqueIndex('agenda_notes_appointment_idx').on(table.appointmentId),
  professionalIdx: index('agenda_notes_professional_idx').on(table.professionalId),
}));

// Payment records per appointment
export const agendaPayments = pgTable('agenda_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  appointmentId: uuid('appointment_id').references(() => agendaAppointments.id),
  clientId: uuid('client_id').references(() => agendaClients.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  method: varchar('method', { length: 30 }), // 'transfer' | 'cash' | 'card' | 'mercadopago'
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'paid' | 'refunded' | 'waived'
  externalId: varchar('external_id', { length: 255 }), // MercadoPago payment ID
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_payments_professional_idx').on(table.professionalId),
  appointmentIdx: index('agenda_payments_appointment_idx').on(table.appointmentId),
}));

// Web Push subscriptions — one per browser/device per user
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('push_subscriptions_user_idx').on(table.userId),
  endpointIdx: uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
}));

// Subscription plans for each vertical
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda'
  planId: varchar('plan_id', { length: 50 }).notNull(), // 'free' | 'pro' | 'enterprise'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  maxListings: integer('max_listings').notNull().default(0),
  maxFeaturedListings: integer('max_featured_listings').notNull().default(0),
  maxImagesPerListing: integer('max_images_per_listing').notNull().default(0),
  analyticsEnabled: boolean('analytics_enabled').notNull().default(false),
  prioritySupport: boolean('priority_support').notNull().default(false),
  customBranding: boolean('custom_branding').notNull().default(false),
  apiAccess: boolean('api_access').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  features: jsonb('features').notNull().default([]), // Array of feature strings
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueVerticalPlan: uniqueIndex('subscription_plans_vertical_plan_idx').on(table.vertical, table.planId),
  verticalIdx: index('subscription_plans_vertical_idx').on(table.vertical),
}));

// User subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'cancelled' | 'paused' | 'expired'
  provider: varchar('provider', { length: 30 }).notNull().default('mercadopago'), // 'mercadopago'
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }), // MercadoPago subscription ID
  providerStatus: varchar('provider_status', { length: 50 }), // MercadoPago status
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Next billing date
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userVerticalIdx: uniqueIndex('subscriptions_user_vertical_idx').on(table.userId, table.vertical),
  userIdx: index('subscriptions_user_idx').on(table.userId),
  verticalIdx: index('subscriptions_vertical_idx').on(table.vertical),
  providerSubIdx: index('subscriptions_provider_idx').on(table.providerSubscriptionId),
}));

// Payment orders for subscriptions, boosts, and advertising
export const paymentOrders = pgTable('payment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda'
  kind: varchar('kind', { length: 30 }).notNull(), // 'subscription' | 'boost' | 'advertising'
  title: varchar('title', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled' | 'refunded'
  provider: varchar('provider', { length: 30 }).notNull().default('mercadopago'),
  providerOrderId: varchar('provider_order_id', { length: 255 }), // MercadoPago preference/payment ID
  providerStatus: varchar('provider_status', { length: 50 }), // Provider-specific status
  providerResponse: jsonb('provider_response'), // Full provider response for debugging
  metadata: jsonb('metadata').notNull().default({}), // Custom data (planId, listingId, etc.)
  returnUrl: text('return_url'),
  webhookUrl: text('webhook_url'),
  paidAt: timestamp('paid_at'),
  refundedAt: timestamp('refunded_at'),
  expiresAt: timestamp('expires_at'), // Order expiration
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('payment_orders_user_idx').on(table.userId),
  subscriptionIdx: index('payment_orders_subscription_idx').on(table.subscriptionId),
  providerOrderIdx: index('payment_orders_provider_idx').on(table.providerOrderId),
  statusIdx: index('payment_orders_status_idx').on(table.status),
  kindIdx: index('payment_orders_kind_idx').on(table.kind),
  verticalIdx: index('payment_orders_vertical_idx').on(table.vertical),
}));

// SimpleAgenda — reusable tags for clients (per professional)
export const agendaClientTags = pgTable('agenda_client_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  color: varchar('color', { length: 20 }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_client_tags_professional_idx').on(table.professionalId),
  uniqueName: uniqueIndex('agenda_client_tags_unique_name_idx').on(table.professionalId, sql`lower(${table.name})`),
}));

// SimpleAgenda — tag ↔ client assignments (composite PK in the SQL migration)
export const agendaClientTagAssignments = pgTable('agenda_client_tag_assignments', {
  clientId: uuid('client_id').references(() => agendaClients.id).notNull(),
  tagId: uuid('tag_id').references(() => agendaClientTags.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tagIdx: index('agenda_client_tag_assignments_tag_idx').on(table.tagId),
}));

// SimpleAgenda — NPS post-cita (Net Promoter Score)
export const agendaNpsResponses = pgTable('agenda_nps_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id).notNull(),
  appointmentId: uuid('appointment_id').references(() => agendaAppointments.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => agendaClients.id),
  token: varchar('token', { length: 64 }).notNull().unique(),
  score: integer('score'), // 0–10, null hasta que responda
  comment: text('comment'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  appointmentIdx: uniqueIndex('agenda_nps_appointment_idx').on(table.appointmentId),
  professionalIdx: index('agenda_nps_professional_idx').on(table.professionalId),
  submittedIdx: index('agenda_nps_submitted_idx').on(table.submittedAt),
}));

// SimpleAgenda — referidos (cliente recomienda a un conocido)
export const agendaReferrals = pgTable('agenda_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  referrerClientId: uuid('referrer_client_id').references(() => agendaClients.id, { onDelete: 'cascade' }).notNull(),
  refereeClientId: uuid('referee_client_id').references(() => agendaClients.id, { onDelete: 'set null' }),
  refereeName: varchar('referee_name', { length: 200 }),
  refereePhone: varchar('referee_phone', { length: 40 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'converted' | 'rewarded' | 'cancelled'
  rewardNote: text('reward_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  convertedAt: timestamp('converted_at'),
  rewardedAt: timestamp('rewarded_at'),
}, (table) => ({
  professionalIdx: index('agenda_referrals_professional_idx').on(table.professionalId),
  referrerIdx: index('agenda_referrals_referrer_idx').on(table.referrerClientId),
  statusIdx: index('agenda_referrals_status_idx').on(table.status),
}));

// SimpleAgenda — promociones / cupones (descuentos aplicables al booking)
export const agendaPromotions = pgTable('agenda_promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 40 }), // opcional: si es null es promo sin cupón (no MVP aún)
  label: varchar('label', { length: 120 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 10 }).notNull().default('percent'), // 'percent' | 'fixed'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'), // 'all' | 'services'
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  minAmount: decimal('min_amount', { precision: 10, scale: 2 }),
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').notNull().default(0),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_promotions_professional_idx').on(table.professionalId),
  codeUniqueIdx: uniqueIndex('agenda_promotions_code_unique_idx').on(table.professionalId, sql`lower(${table.code})`),
}));

// SimpleAgenda — packs (definición vendible: ej. "5 sesiones a precio especial")
export const agendaPacks = pgTable('agenda_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  sessionsCount: integer('sessions_count').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'), // 'all' | 'services'
  validityDays: integer('validity_days'),
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_packs_professional_idx').on(table.professionalId),
}));

// SimpleAgenda — pack comprado por un cliente con saldo de sesiones
export const agendaClientPacks = pgTable('agenda_client_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  packId: uuid('pack_id'), // referencia suave (si borran el pack el saldo sigue)
  clientId: uuid('client_id').references(() => agendaClients.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 160 }).notNull(), // snapshot del nombre del pack al momento de compra
  sessionsTotal: integer('sessions_total').notNull(),
  sessionsUsed: integer('sessions_used').notNull().default(0),
  pricePaid: decimal('price_paid', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'expired' | 'completed' | 'refunded'
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_client_packs_professional_idx').on(table.professionalId),
  clientIdx: index('agenda_client_packs_client_idx').on(table.clientId),
  statusIdx: index('agenda_client_packs_status_idx').on(table.status),
}));

// SimpleAgenda — asistentes a sesión grupal (service_id → agenda_services con kind group_event)
export const agendaGroupAttendees = pgTable('agenda_group_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => agendaServices.id, { onDelete: 'cascade' }).notNull(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => agendaClients.id, { onDelete: 'set null' }),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  clientEmail: varchar('client_email', { length: 200 }),
  clientPhone: varchar('client_phone', { length: 40 }),
  status: varchar('status', { length: 20 }).notNull().default('registered'),
  pricePaid: decimal('price_paid', { precision: 10, scale: 2 }),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  registeredAt: timestamp('registered_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdx: index('agenda_group_attendees_session_idx').on(table.sessionId),
  professionalIdx: index('agenda_group_attendees_professional_idx').on(table.professionalId),
  clientIdx: index('agenda_group_attendees_client_idx').on(table.clientId),
}));

// SimpleAgenda — audit log of sensitive actions by professionals
export const agendaAuditEvents = pgTable('agenda_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: varchar('entity_type', { length: 40 }).notNull(), // 'profile' | 'service' | 'availability' | 'appointment' | 'payment' | 'location' | 'client'
  entityId: varchar('entity_id', { length: 100 }),
  action: varchar('action', { length: 60 }).notNull(), // 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'slug_change' | 'status_change'
  metadata: jsonb('metadata').notNull().default({}),
  ipAddress: varchar('ip_address', { length: 60 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_audit_events_professional_idx').on(table.professionalId),
  createdAtIdx: index('agenda_audit_events_created_at_idx').on(table.createdAt),
  entityIdx: index('agenda_audit_events_entity_idx').on(table.entityType, table.entityId),
}));

// SimpleAgenda — log of notifications sent (email, whatsapp, push)
export const agendaNotificationEvents = pgTable('agenda_notification_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'set null' }),
  appointmentId: uuid('appointment_id').references(() => agendaAppointments.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => agendaClients.id, { onDelete: 'set null' }),
  channel: varchar('channel', { length: 20 }).notNull(), // 'email' | 'whatsapp' | 'push' | 'sms'
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'confirmation' | 'reminder_24h' | 'reminder_30min' | 'cancellation' | 'test' | 'professional_new_booking'
  recipient: varchar('recipient', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('sent'), // 'sent' | 'failed' | 'skipped'
  errorMessage: text('error_message'),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_notification_events_professional_idx').on(table.professionalId),
  appointmentIdx: index('agenda_notification_events_appointment_idx').on(table.appointmentId),
  createdAtIdx: index('agenda_notification_events_created_at_idx').on(table.createdAt),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SimpleSerenatas
// ═══════════════════════════════════════════════════════════════════════════════

export const serenataMusicians = pgTable('serenata_musicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  instrument: varchar('instrument', { length: 80 }),
  instruments: jsonb('instruments').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  bio: text('bio'),
  comuna: varchar('comuna', { length: 120 }),
  region: varchar('region', { length: 120 }),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  isAvailable: boolean('is_available').notNull().default(true),
  availableNow: boolean('available_now').notNull().default(false),
  experienceYears: integer('experience_years').notNull().default(0),
  workZones: jsonb('working_comunas').$type<string[]>().notNull().default(sql`'[]'::jsonb`), // DB column: working_comunas (legacy name)
  hasInstrument: boolean('has_instrument').notNull().default(false),
  hasMariachiAttire: boolean('has_mariachi_attire').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('serenata_musicians_user_idx').on(table.userId),
  locationIdx: index('serenata_musicians_location_idx').on(table.region, table.comuna),
}));

export const serenataClients = pgTable('serenata_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  phone: varchar('phone', { length: 40 }),
  comuna: varchar('comuna', { length: 120 }),
  region: varchar('region', { length: 120 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('serenata_clients_user_idx').on(table.userId),
  locationIdx: index('serenata_clients_location_idx').on(table.region, table.comuna),
}));

export const serenataOwners = pgTable('serenata_owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bio: text('bio'),
  comuna: varchar('comuna', { length: 120 }),
  region: varchar('region', { length: 120 }),
  workingComunas: jsonb('working_comunas').$type<string[]>().notNull().default([]),
  acceptsUrgent: boolean('accepts_urgent').notNull().default(false),
  minPrice: integer('min_price'),
  maxPrice: integer('max_price'),
  subscriptionStatus: varchar('subscription_status', { length: 30 }).notNull().default('trialing'),
  subscriptionPrice: integer('subscription_price').notNull().default(9990),
  commissionRateBps: integer('commission_rate_bps').notNull().default(800),
  commissionVatRateBps: integer('commission_vat_rate_bps').notNull().default(1900),
  trialEndsAt: timestamp('trial_ends_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('serenata_owners_user_idx').on(table.userId),
}));

export const serenataProviderGroups = pgTable('serenata_provider_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => serenataOwners.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 180 }).notNull(),
  accountKind: varchar('account_kind', { length: 20 }).notNull().default('individual'),
  operatorSubtype: varchar('operator_subtype', { length: 40 }),
  operatorSubtypeCustom: varchar('operator_subtype_custom', { length: 160 }),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  phone: varchar('phone', { length: 40 }),
  whatsapp: varchar('whatsapp', { length: 40 }),
  publicEmail: varchar('public_email', { length: 255 }),
  websiteUrl: varchar('website_url', { length: 500 }),
  instagramUrl: varchar('instagram_url', { length: 500 }),
  facebookUrl: varchar('facebook_url', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  tiktokUrl: varchar('tiktok_url', { length: 500 }),
  youtubeUrl: varchar('youtube_url', { length: 500 }),
  twitterUrl: varchar('twitter_url', { length: 500 }),
  region: varchar('region', { length: 120 }),
  comunaBase: varchar('comuna_base', { length: 120 }),
  serviceComunas: jsonb('service_comunas').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  countryCode: varchar('country_code', { length: 3 }).notNull().default('CL'),
  regionId: varchar('region_id', { length: 50 }),
  localityId: varchar('locality_id', { length: 50 }),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  isVerified: boolean('is_verified').notNull().default(false),
  ratingAverage: decimal('rating_average', { precision: 4, scale: 2 }).notNull().default('0'),
  ratingCount: integer('rating_count').notNull().default(0),
  slaHours: integer('sla_hours').notNull().default(24),
  bookingWindowDays: integer('booking_window_days').notNull().default(30),
  cancellationHours: integer('cancellation_hours').notNull().default(24),
  bookingMode: varchar('booking_mode', { length: 30 }).notNull().default('manual'),
  bufferMinutes: integer('buffer_minutes').notNull().default(0),
  bookingTermsText: text('booking_terms_text'),
  requiresAdvancePayment: boolean('requires_advance_payment').notNull().default(false),
  advancePaymentInstructions: text('advance_payment_instructions'),
  acceptsCash: boolean('accepts_cash').notNull().default(false),
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
  alwaysOpen: boolean('always_open').notNull().default(false),
  scheduleNote: varchar('schedule_note', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Santiago'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('serenata_provider_groups_slug_idx').on(table.slug),
  ownerUserIdx: index('serenata_provider_groups_owner_user_idx').on(table.ownerUserId),
  ownerProfileIdx: index('serenata_provider_groups_owner_idx').on(table.ownerId),
  statusIdx: index('serenata_provider_groups_status_idx').on(table.status),
}));

export const serenataGroupServices = pgTable('serenata_group_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  musiciansCount: integer('musicians_count').notNull().default(3),
  durationMinutes: integer('duration_minutes').notNull().default(45),
  price: integer('price').notNull(), // CLP — integer sin decimales
  promoPrice: integer('promo_price'),
  currency: varchar('currency', { length: 8 }).notNull().default('CLP'),
  eventType: varchar('event_type', { length: 80 }),
  songsIncluded: integer('songs_included').notNull().default(0),
  repertoirePolicy: varchar('repertoire_policy', { length: 24 }).notNull().default('any_active'),
  imageUrl: varchar('image_url', { length: 500 }),
  color: varchar('color', { length: 20 }),
  isOnline: boolean('is_online').notNull().default(false),
  isPresential: boolean('is_presential').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_group_services_provider_idx').on(table.providerGroupId),
}));

export const serenataGroupServicePacks = pgTable('serenata_group_service_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 500 }),
  sessionsCount: integer('sessions_count').notNull().default(1),
  price: integer('price').notNull(),
  promoPrice: integer('promo_price'),
  currency: varchar('currency', { length: 8 }).notNull().default('CLP'),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  validityDays: integer('validity_days'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_group_service_packs_provider_idx').on(table.providerGroupId),
}));

export const serenataGroupServicePromotions = pgTable('serenata_group_service_promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 120 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 10 }).notNull().default('percent'),
  discountValue: integer('discount_value').notNull(),
  appliesTo: varchar('applies_to', { length: 10 }).notNull().default('all'),
  serviceIds: jsonb('service_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_group_service_promotions_provider_idx').on(table.providerGroupId),
}));

export const serenataSongCatalog = pgTable('serenata_song_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  titleNormalized: varchar('title_normalized', { length: 220 }).notNull(),
  artist: varchar('artist', { length: 160 }),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isPreset: boolean('is_preset').notNull().default(false),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  titleNormIdx: uniqueIndex('serenata_song_catalog_title_norm_idx').on(table.titleNormalized),
  presetIdx: index('serenata_song_catalog_preset_idx').on(table.isPreset),
}));

export const serenataRepertoireSongs = pgTable('serenata_repertoire_songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  catalogSongId: uuid('catalog_song_id').references(() => serenataSongCatalog.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 200 }).notNull(),
  artist: varchar('artist', { length: 160 }),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_repertoire_songs_provider_idx').on(table.providerGroupId),
  activeIdx: index('serenata_repertoire_songs_active_idx').on(table.providerGroupId, table.isActive),
  providerCatalogIdx: uniqueIndex('serenata_repertoire_provider_catalog_idx')
    .on(table.providerGroupId, table.catalogSongId)
    .where(sql`${table.catalogSongId} is not null`),
}));

export const serenataServiceSongs = pgTable('serenata_service_songs', {
  serviceId: uuid('service_id').references(() => serenataGroupServices.id, { onDelete: 'cascade' }).notNull(),
  repertoireSongId: uuid('repertoire_song_id').references(() => serenataRepertoireSongs.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.serviceId, table.repertoireSongId] }),
}));

export const serenataSongScores = pgTable('serenata_song_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  repertoireSongId: uuid('repertoire_song_id').references(() => serenataRepertoireSongs.id, { onDelete: 'cascade' }).notNull(),
  instrument: varchar('instrument', { length: 80 }).notNull(),
  format: varchar('format', { length: 16 }).notNull().default('pdf'),
  storageUrl: text('storage_url').notNull(),
  originalFilename: varchar('original_filename', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  songInstrumentIdx: uniqueIndex('serenata_song_scores_song_instrument_idx').on(table.repertoireSongId, table.instrument),
}));

export const serenataSongSelections = pgTable('serenata_song_selections', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').references(() => serenatas.id, { onDelete: 'cascade' }).notNull(),
  repertoireSongId: uuid('repertoire_song_id').references(() => serenataRepertoireSongs.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 32 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  artist: varchar('artist', { length: 160 }),
  sortOrder: integer('sort_order').notNull().default(0),
  clientNote: text('client_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serenataIdx: index('serenata_song_selections_serenata_idx').on(table.serenataId),
}));

export const serenataProviderGroupMembers = pgTable('serenata_provider_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 30 }).notNull().default('musician'),
  instruments: jsonb('instruments').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  status: varchar('status', { length: 30 }).notNull().default('invited'),
  message: text('message'),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_provider_group_members_provider_idx').on(table.providerGroupId),
  musicianIdx: index('serenata_provider_group_members_musician_idx').on(table.musicianId),
  statusIdx: index('serenata_provider_group_members_status_idx').on(table.status),
  uniqueProviderMusician: uniqueIndex('serenata_provider_group_members_unique_idx').on(table.providerGroupId, table.musicianId),
}));

export const serenataProviderGroupMemberInvites = pgTable('serenata_provider_group_member_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  displayName: varchar('display_name', { length: 160 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 40 }),
  token: varchar('token', { length: 64 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('serenata_provider_group_member_invites_token_idx').on(table.token),
  providerIdx: index('serenata_provider_group_member_invites_provider_idx').on(table.providerGroupId),
  statusIdx: index('serenata_provider_group_member_invites_status_idx').on(table.status),
}));

export const serenataAvailabilityRules = pgTable('serenata_availability_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  breakStart: varchar('break_start', { length: 5 }),
  breakEnd: varchar('break_end', { length: 5 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_availability_rules_provider_idx').on(table.providerGroupId),
}));

export const serenataProviderGroupBlockedSlots = pgTable('serenata_provider_group_blocked_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerIdx: index('serenata_provider_group_blocked_slots_provider_idx').on(table.providerGroupId),
}));

export const serenataSavedProviderGroups = pgTable('serenata_saved_provider_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'cascade' }).notNull(),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserGroup: uniqueIndex('serenata_saved_provider_groups_user_group_idx').on(table.userId, table.providerGroupId),
}));

export const serenataProviderGroupApplications = pgTable('serenata_provider_group_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 160 }).notNull(),
  description: text(),
  phone: varchar('phone', { length: 40 }),
  whatsapp: varchar('whatsapp', { length: 40 }),
  region: varchar('region', { length: 120 }),
  comunaBase: varchar('comuna_base', { length: 120 }),
  serviceComunas: jsonb('service_comunas').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('serenata_provider_group_applications_user_idx').on(table.userId),
  statusIdx: index('serenata_provider_group_applications_status_idx').on(table.status),
}));

export const serenataGroups = pgTable('serenata_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => serenataOwners.id, { onDelete: 'cascade' }).notNull(),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 160 }).notNull(),
  date: timestamp('date').notNull(),
  maxMusicians: integer('max_musicians'),
  requiredInstruments: jsonb('required_instruments').$type<string[]>().notNull().default([]),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('serenata_groups_owner_idx').on(table.ownerId),
  providerIdx: index('serenata_groups_provider_idx').on(table.providerGroupId),
  dateIdx: index('serenata_groups_date_idx').on(table.date),
}));

export const serenatas = pgTable('serenatas', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => serenataClients.id, { onDelete: 'set null' }),
  ownerId: uuid('owner_id').references(() => serenataOwners.id, { onDelete: 'set null' }),
  providerGroupId: uuid('provider_group_id').references(() => serenataProviderGroups.id, { onDelete: 'set null' }),
  selectedServiceId: uuid('selected_service_id').references(() => serenataGroupServices.id, { onDelete: 'set null' }),
  groupId: uuid('group_id').references(() => serenataGroups.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 30 }).notNull().default('own_lead'),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'),
  paymentStatus: varchar('payment_status', { length: 30 }).notNull().default('not_required'),
  paymentOrderId: varchar('payment_order_id', { length: 120 }),
  paidAt: timestamp('paid_at'),
  /** Forma de pago registrada por el dueño (solo serenatas propias). */
  ownerCollectionMethod: varchar('owner_collection_method', { length: 24 }),
  /** Estado de liquidación hacia el dueño (solo serenatas de la app). */
  ownerPayoutStatus: varchar('owner_payout_status', { length: 24 }),
  ownerPayoutAt: timestamp('owner_payout_at'),
  ownerPayoutReference: text('owner_payout_reference'),
  ownerPayoutAmount: integer('owner_payout_amount'),
  recipientName: varchar('recipient_name', { length: 160 }).notNull(),
  clientPhone: varchar('client_phone', { length: 40 }),
  address: text('address').notNull(),
  comuna: varchar('comuna', { length: 120 }),
  region: varchar('region', { length: 120 }),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  eventDate: timestamp('event_date').notNull(),
  eventTime: varchar('event_time', { length: 10 }),
  flexibleSchedule: boolean('flexible_schedule').notNull().default(false),
  duration: integer('duration').notNull().default(45),
  price: integer('price'),
  packageCode: varchar('package_code', { length: 30 }),
  eventType: varchar('event_type', { length: 80 }),
  message: text('message'),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
  cancelReason: text('cancel_reason'),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id, { onDelete: 'set null' }),
  clientConfirmedAt: timestamp('client_confirmed_at'),
  clientRating: integer('client_rating'),
  clientReviewComment: text('client_review_comment'),
  closureReminderSentAt: timestamp('closure_reminder_sent_at'),
  policyAgreed: boolean('policy_agreed').notNull().default(false),
  policyAgreedAt: timestamp('policy_agreed_at'),
  responseDueAt: timestamp('response_due_at', { withTimezone: true }),
  expiredAt: timestamp('expired_at', { withTimezone: true }),
  expiredReason: varchar('expired_reason', { length: 40 }),
  pendingReminderSentAt: timestamp('pending_reminder_sent_at', { withTimezone: true }),
  setlistStatus: varchar('setlist_status', { length: 24 }).notNull().default('pending_owner'),
  songsIncludedAtBooking: integer('songs_included_at_booking'),
  setlistConfirmedAt: timestamp('setlist_confirmed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clientIdx: index('serenatas_client_idx').on(table.clientId),
  ownerIdx: index('serenatas_owner_idx').on(table.ownerId),
  providerGroupIdx: index('serenatas_provider_group_idx').on(table.providerGroupId),
  groupIdx: index('serenatas_group_idx').on(table.groupId),
  eventDateIdx: index('serenatas_event_date_idx').on(table.eventDate),
}));

export const serenataMusicianPayouts = pgTable('serenata_musician_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').references(() => serenatas.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => serenataOwners.id, { onDelete: 'cascade' }).notNull(),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id, { onDelete: 'set null' }),
  musicianName: varchar('musician_name', { length: 160 }),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 24 }).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 24 }),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('serenata_musician_payouts_owner_idx').on(table.ownerId),
  serenataIdx: index('serenata_musician_payouts_serenata_idx').on(table.serenataId),
  statusIdx: index('serenata_musician_payouts_status_idx').on(table.ownerId, table.status),
}));

export const serenataOffers = pgTable('serenata_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').references(() => serenatas.id, { onDelete: 'cascade' }).notNull(),
  ownerId: uuid('owner_id').references(() => serenataOwners.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('offered'),
  rank: integer('rank').notNull().default(0),
  offeredAt: timestamp('offered_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  serenataIdx: index('serenata_offers_serenata_idx').on(table.serenataId),
  ownerIdx: index('serenata_offers_owner_idx').on(table.ownerId),
  statusIdx: index('serenata_offers_status_idx').on(table.status),
  uniqueOffer: uniqueIndex('serenata_offers_unique_owner_idx').on(table.serenataId, table.ownerId),
}));

export const serenataGroupMembers = pgTable('serenata_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => serenataGroups.id, { onDelete: 'cascade' }).notNull(),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id, { onDelete: 'cascade' }).notNull(),
  instrument: varchar('instrument', { length: 80 }),
  slotIndex: integer('slot_index'),
  status: varchar('status', { length: 30 }).notNull().default('invited'),
  message: text('message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  groupIdx: index('serenata_group_members_group_idx').on(table.groupId),
  musicianIdx: index('serenata_group_members_musician_idx').on(table.musicianId),
  uniqueGroupMusician: uniqueIndex('serenata_group_members_unique_idx').on(table.groupId, table.musicianId),
}));

export const serenataGroupInvites = pgTable('serenata_group_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => serenataGroups.id, { onDelete: 'cascade' }).notNull(),
  invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  displayName: varchar('display_name', { length: 160 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 40 }),
  token: varchar('token', { length: 64 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('serenata_group_invites_token_idx').on(table.token),
  groupIdx: index('serenata_group_invites_group_idx').on(table.groupId),
  statusIdx: index('serenata_group_invites_status_idx').on(table.status),
}));

export const userNotificationLog = pgTable('user_notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  eventType: varchar('event_type', { length: 60 }).notNull(),
  summary: varchar('summary', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index('user_notification_log_user_created_idx').on(table.userId, table.createdAt),
}));

export const platformNotifications = pgTable('platform_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vertical: varchar('vertical', { length: 20 }),
  type: varchar('type', { length: 60 }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  body: text('body'),
  actionUrl: varchar('action_url', { length: 500 }),
  entityType: varchar('entity_type', { length: 40 }),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userCreatedIdx: index('platform_notifications_user_created_idx').on(table.userId, table.createdAt),
  userUnreadIdx: index('platform_notifications_user_unread_idx').on(table.userId, table.isRead),
}));

/** Relationship Engine — append-only product timeline (not admin audit). */
export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 80 }).notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  businessId: uuid('business_id').notNull(),
  personKind: varchar('person_kind', { length: 40 }),
  personId: varchar('person_id', { length: 80 }),
  subjectKind: varchar('subject_kind', { length: 60 }).notNull(),
  subjectId: varchar('subject_id', { length: 80 }).notNull(),
  actor: varchar('actor', { length: 40 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessPersonOccurredIdx: index('timeline_events_business_person_occurred_idx').on(
    table.businessId,
    table.personId,
    table.occurredAt,
  ),
  businessSubjectIdx: index('timeline_events_business_subject_idx').on(
    table.businessId,
    table.subjectKind,
    table.subjectId,
  ),
  businessOccurredIdx: index('timeline_events_business_occurred_idx').on(table.businessId, table.occurredAt),
}));

/** Relationship Engine — private notes on a contact (business × person). */
export const relationshipNotes = pgTable('relationship_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  businessId: uuid('business_id').notNull(),
  personKind: varchar('person_kind', { length: 40 }).notNull().default('opaque'),
  personId: varchar('person_id', { length: 160 }).notNull(),
  body: text('body').notNull(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessPersonCreatedIdx: index('relationship_notes_business_person_created_idx').on(
    table.vertical,
    table.businessId,
    table.personId,
    table.createdAt,
  ),
}));

// ═══════════════════════════════════════════════════════════════════════════════
