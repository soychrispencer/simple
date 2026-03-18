import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin' | 'superadmin'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'verified' | 'suspended'
  avatarUrl: varchar('avatar_url', { length: 500 }),
  // OAuth fields
  provider: varchar('provider', { length: 20 }), // 'local' | 'google' | 'facebook' | etc.
  providerId: varchar('provider_id', { length: 255 }), // ID from OAuth provider
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

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

// Listings table
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
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

export const instagramAccounts = pgTable('instagram_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  instagramUserId: varchar('instagram_user_id', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  accountType: varchar('account_type', { length: 50 }),
  profilePictureUrl: varchar('profile_picture_url', { length: 500 }),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: jsonb('scopes'),
  autoPublishEnabled: boolean('auto_publish_enabled').notNull().default(false),
  captionTemplate: text('caption_template'),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  lastSyncedAt: timestamp('last_synced_at'),
  lastPublishedAt: timestamp('last_published_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('instagram_accounts_user_vertical_idx').on(table.userId, table.vertical),
}));

export const instagramPublications = pgTable('instagram_publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  instagramAccountId: uuid('instagram_account_id').references(() => instagramAccounts.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  listingId: varchar('listing_id', { length: 255 }).notNull(),
  listingTitle: varchar('listing_title', { length: 255 }).notNull(),
  instagramMediaId: varchar('instagram_media_id', { length: 255 }),
  instagramPermalink: varchar('instagram_permalink', { length: 500 }),
  caption: text('caption').notNull(),
  imageUrl: text('image_url').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('published'),
  errorMessage: text('error_message'),
  sourceUpdatedAt: timestamp('source_updated_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const publicProfiles = pgTable('public_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  slug: varchar('slug', { length: 80 }).notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  accountKind: varchar('account_kind', { length: 20 }).notNull().default('individual'),
  leadRoutingMode: varchar('lead_routing_mode', { length: 20 }).notNull().default('round_robin'),
  leadRoutingCursor: integer('lead_routing_cursor').notNull().default(0),
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
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  avatarImageUrl: varchar('avatar_image_url', { length: 500 }),
  socialLinks: jsonb('social_links').$type<Record<string, string | null>>().notNull().default(sql`'{}'::jsonb`),
  businessHours: jsonb('business_hours').$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
  specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  scheduleNote: varchar('schedule_note', { length: 255 }),
  alwaysOpen: boolean('always_open').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('public_profiles_user_vertical_idx').on(table.userId, table.vertical),
  uniqueVerticalSlug: uniqueIndex('public_profiles_vertical_slug_idx').on(table.vertical, table.slug),
}));

export const publicProfileTeamMembers = pgTable('public_profile_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  roleTitle: varchar('role_title', { length: 120 }),
  bio: text('bio'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 40 }),
  whatsapp: varchar('whatsapp', { length: 40 }),
  avatarImageUrl: varchar('avatar_image_url', { length: 500 }),
  socialLinks: jsonb('social_links').$type<Record<string, string | null>>().notNull().default(sql`'{}'::jsonb`),
  specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isLeadContact: boolean('is_lead_contact').notNull().default(false),
  receivesLeads: boolean('receives_leads').notNull().default(true),
  isPublished: boolean('is_published').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const crmPipelineColumns = pgTable('crm_pipeline_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  scope: varchar('scope', { length: 20 }).notNull().default('listing'),
  name: varchar('name', { length: 80 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const serviceLeads = pgTable('service_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  serviceType: varchar('service_type', { length: 40 }).notNull(),
  planId: varchar('plan_id', { length: 20 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 40 }).notNull(),
  contactWhatsapp: varchar('contact_whatsapp', { length: 40 }),
  locationLabel: varchar('location_label', { length: 255 }),
  assetType: varchar('asset_type', { length: 120 }),
  assetBrand: varchar('asset_brand', { length: 120 }),
  assetModel: varchar('asset_model', { length: 120 }),
  assetYear: varchar('asset_year', { length: 20 }),
  assetMileage: varchar('asset_mileage', { length: 80 }),
  assetArea: varchar('asset_area', { length: 80 }),
  expectedPrice: varchar('expected_price', { length: 80 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('new'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  closeReason: varchar('close_reason', { length: 255 }),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
  nextTaskTitle: varchar('next_task_title', { length: 255 }),
  nextTaskAt: timestamp('next_task_at'),
  sourcePage: varchar('source_page', { length: 255 }),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const serviceLeadActivities = pgTable('service_lead_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => serviceLeads.id).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull(),
  body: text('body').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const listingLeads = pgTable('listing_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  ownerUserId: uuid('owner_user_id').references(() => users.id).notNull(),
  buyerUserId: uuid('buyer_user_id').references(() => users.id),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  source: varchar('source', { length: 40 }).notNull().default('internal_form'),
  channel: varchar('channel', { length: 20 }).notNull().default('lead'),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 40 }),
  contactWhatsapp: varchar('contact_whatsapp', { length: 40 }),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().default('new'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  closeReason: varchar('close_reason', { length: 255 }),
  tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
  assignedToTeamMemberId: uuid('assigned_to_team_member_id').references(() => publicProfileTeamMembers.id),
  pipelineColumnId: uuid('pipeline_column_id').references(() => crmPipelineColumns.id),
  nextTaskTitle: varchar('next_task_title', { length: 255 }),
  nextTaskAt: timestamp('next_task_at'),
  sourcePage: varchar('source_page', { length: 255 }),
  externalSourceId: varchar('external_source_id', { length: 255 }),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const listingLeadActivities = pgTable('listing_lead_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => listingLeads.id).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull(),
  body: text('body').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  vertical: varchar('vertical', { length: 20 }).notNull(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  ownerUserId: uuid('owner_user_id').references(() => users.id).notNull(),
  buyerUserId: uuid('buyer_user_id').references(() => users.id).notNull(),
  leadId: uuid('lead_id').references(() => listingLeads.id).notNull(),
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
  uniqueListingBuyerThread: uniqueIndex('message_threads_listing_buyer_idx').on(table.listingId, table.buyerUserId),
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
