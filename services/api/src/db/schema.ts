import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'user' | 'admin' | 'superadmin'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'verified' | 'suspended'
  primaryVertical: varchar('primary_vertical', { length: 20 }), // NULL = platform/superadmin; 'autos' | 'propiedades' | 'agenda' | 'serenatas'
  avatarUrl: varchar('avatar_url', { length: 500 }),
  // OAuth fields
  provider: varchar('provider', { length: 20 }), // 'local' | 'google' | 'facebook' | etc.
  providerId: varchar('provider_id', { length: 255 }), // ID from OAuth provider
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

// Listings table
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVertical: uniqueIndex('instagram_accounts_user_vertical_idx').on(table.userId, table.vertical),
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

export const addressBook = pgTable('address_book', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  kind: varchar('kind', { length: 20 }).notNull().default('personal'), // office | clinic | store | branch | company | personal | shipping | billing | warehouse | pickup | other
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
  geoPoint: jsonb('geo_point'), // { latitude: number, longitude: number, precision: string }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('address_book_user_id_idx').on(table.userId),
}));


export const crmPipelineColumns = pgTable('crm_pipeline_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
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
  accountId: uuid('account_id').references(() => accounts.id),
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
  accountId: uuid('account_id').references(() => accounts.id),
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
  accountId: uuid('account_id').references(() => accounts.id),
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
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Santiago'),
  bookingWindowDays: integer('booking_window_days').notNull().default(30), // how far in advance clients can book
  cancellationHours: integer('cancellation_hours').notNull().default(24),  // min hours notice to cancel
  confirmationMode: varchar('confirmation_mode', { length: 20 }).notNull().default('auto'), // 'auto' | 'manual'
  allowsRecurrentBooking: boolean('allows_recurrent_booking').notNull().default(true), // patient can book a recurring series publicly
  // Encuadre & advance payment
  encuadre: text('encuadre'), // Policy text shown to client at booking (e.g. no-show = no refund)
  requiresAdvancePayment: boolean('requires_advance_payment').notNull().default(false),
  advancePaymentInstructions: text('advance_payment_instructions'), // Bank transfer info, etc.
  // WhatsApp notification preferences
  waNotificationsEnabled: boolean('wa_notifications_enabled').notNull().default(true),
  waNotifyProfessional: boolean('wa_notify_professional').notNull().default(true),
  waProfessionalPhone: varchar('wa_professional_phone', { length: 30 }),
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
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  preconsultFields: jsonb('preconsult_fields').$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
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
  crmEnabled: boolean('crm_enabled').notNull().default(false),
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
  professionalId: uuid('professional_id').notNull(),
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

// SimpleAgenda — sesiones grupales (talleres, clases, grupos)
export const agendaGroupSessions = pgTable('agenda_group_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id'),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  modality: varchar('modality', { length: 20 }).notNull().default('presential'),
  location: text('location'),
  meetingUrl: text('meeting_url'),
  status: varchar('status', { length: 20 }).notNull().default('scheduled'),
  isPublic: boolean('is_public').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  professionalIdx: index('agenda_group_sessions_professional_idx').on(table.professionalId),
  startsAtIdx: index('agenda_group_sessions_starts_at_idx').on(table.startsAt),
  statusIdx: index('agenda_group_sessions_status_idx').on(table.status),
}));

// SimpleAgenda — asistentes a sesión grupal
export const agendaGroupAttendees = pgTable('agenda_group_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => agendaGroupSessions.id, { onDelete: 'cascade' }).notNull(),
  professionalId: uuid('professional_id').references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id'),
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
  professionalId: uuid('professional_id'),
  userId: uuid('user_id'),
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
  professionalId: uuid('professional_id'),
  appointmentId: uuid('appointment_id'),
  clientId: uuid('client_id'),
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
// SimpleSerenatas — Sistema operativo para músicos de mariachis
// ═══════════════════════════════════════════════════════════════════════════════

// Enum values for instrument types
export const instrumentEnum = [
  'trumpet', 'voice', 'guitar', 'vihuela', 'guitarron',
  'violin', 'accordion', 'percussion', 'other'
] as const;

// Enum for serenata status
export const serenataStatusEnum = [
  'pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled'
] as const;

// Enum for group assignment status
export const assignmentStatusEnum = [
  'pending', 'confirmed', 'completed', 'cancelled'
] as const;

// Musicians table — extends users with musician-specific data
export const serenataMusicians = pgTable('serenata_musicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  // Profile info
  instrument: varchar('instrument', { length: 30 }).notNull(), // instrumentEnum
  experience: integer('experience'), // years of experience
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  // Location
  comuna: varchar('comuna', { length: 100 }),
  region: varchar('region', { length: 100 }),
  lat: decimal('lat', { precision: 10, scale: 8 }),
  lng: decimal('lng', { precision: 11, scale: 8 }),
  // Availability
  isAvailable: boolean('is_available').notNull().default(true),
  isOnline: boolean('is_online').notNull().default(false),
  availableNow: boolean('available_now').notNull().default(false), // for urgent bookings
  availabilitySchedule: jsonb('availability_schedule'), // weekly schedule
  // Ratings & metrics
  rating: decimal('rating', { precision: 3, scale: 2 }).default('5.00'),
  totalSerenatas: integer('total_serenatas').notNull().default(0),
  completedSerenatas: integer('completed_serenatas').notNull().default(0),
  // Payment info
  paymentInfo: jsonb('payment_info'), // bank account, etc.
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'), // %
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'suspended' | 'inactive'
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('serenata_musicians_user_idx').on(table.userId),
  locationIdx: index('serenata_musicians_location_idx').on(table.lat, table.lng),
  availableIdx: index('serenata_musicians_available_idx').on(table.isAvailable),
  availableNowIdx: index('serenata_musicians_available_now_idx').on(table.availableNow),
  instrumentIdx: index('serenata_musicians_instrument_idx').on(table.instrument),
}));

// Serenata requests — client bookings
export const serenataRequests = pgTable('serenata_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Client info
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 20 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  // Location
  address: text('address').notNull(),
  comuna: varchar('comuna', { length: 100 }),
  lat: decimal('lat', { precision: 10, scale: 8 }),
  lng: decimal('lng', { precision: 11, scale: 8 }),
  // Event details
  dateTime: timestamp('date_time').notNull(),
  duration: integer('duration').notNull().default(30), // minutes
  occasion: varchar('occasion', { length: 50 }), // 'birthday', 'anniversary', 'love', 'other'
  message: text('message'), // custom message for the serenata
  specialRequests: text('special_requests'),
  // Requirements
  requiredInstruments: jsonb('required_instruments'), // ['trumpet', 'voice', 'guitar']
  minMusicians: integer('min_musicians').notNull().default(3),
  maxMusicians: integer('max_musicians'),
  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  commission: decimal('commission', { precision: 10, scale: 2 }),
  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // serenataStatusEnum
  urgency: varchar('urgency', { length: 20 }).notNull().default('normal'), // 'normal' | 'urgent' | 'express'
  // Assignment
  assignedGroupId: uuid('assigned_group_id'),
  assignedAt: timestamp('assigned_at'),
  // Source
  source: varchar('source', { length: 30 }).default('web'), // 'web', 'whatsapp', 'phone', 'referral'
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
}, (table) => ({
  dateTimeIdx: index('serenata_requests_date_time_idx').on(table.dateTime),
  statusIdx: index('serenata_requests_status_idx').on(table.status),
  locationIdx: index('serenata_requests_location_idx').on(table.lat, table.lng),
  urgencyIdx: index('serenata_requests_urgency_idx').on(table.urgency),
}));

// Groups — dynamic ensembles for serenatas
export const serenataGroups = pgTable('serenata_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date').notNull(), // date of the serenatas
  // Leader
  createdBy: uuid('created_by').references(() => serenataMusicians.id).notNull(),
  captainId: uuid('captain_id').references(() => serenataMusicians.id),
  // Serenatas assigned
  serenataIds: jsonb('serenata_ids').notNull().default('[]'),
  // Route optimization
  optimizedOrder: jsonb('optimized_order'), // ordered list of serenata IDs
  routeDistance: decimal('route_distance', { precision: 10, scale: 2 }), // km
  estimatedDuration: integer('estimated_duration'), // minutes
  // Status
  status: varchar('status', { length: 20 }).notNull().default('forming'), // 'forming' | 'confirmed' | 'active' | 'completed'
  // Financials
  totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0'),
  platformCommission: decimal('platform_commission', { precision: 10, scale: 2 }).default('0'),
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  dateIdx: index('serenata_groups_date_idx').on(table.date),
  captainIdx: index('serenata_groups_captain_idx').on(table.captainId),
  statusIdx: index('serenata_groups_status_idx').on(table.status),
}));

// Group members — junction table
export const serenataGroupMembers = pgTable('serenata_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => serenataGroups.id).notNull(),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id).notNull(),
  role: varchar('role', { length: 30 }).notNull(), // instrument or 'captain'
  // Financials
  earnings: decimal('earnings', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).notNull().default('invited'), // 'invited' | 'accepted' | 'confirmed' | 'completed' | 'declined'
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueGroupMusician: uniqueIndex('serenata_group_members_unique_idx').on(table.groupId, table.musicianId),
  groupIdx: index('serenata_group_members_group_idx').on(table.groupId),
  musicianIdx: index('serenata_group_members_musician_idx').on(table.musicianId),
}));

// Assignments — linking serenatas to groups
export const serenataAssignments = pgTable('serenata_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').references(() => serenataRequests.id).notNull(),
  groupId: uuid('group_id').references(() => serenataGroups.id).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // assignmentStatusEnum
  position: integer('position').notNull().default(0), // order in route
  estimatedArrival: timestamp('estimated_arrival'),
  actualArrival: timestamp('actual_arrival'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueSerenata: uniqueIndex('serenata_assignments_serenata_idx').on(table.serenataId),
  groupIdx: index('serenata_assignments_group_idx').on(table.groupId),
}));

// Routes — optimized routes for groups
export const serenataRoutes = pgTable('serenata_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').references(() => serenataGroups.id).notNull(),
  date: timestamp('date').notNull(),
  // Route data
  waypoints: jsonb('waypoints').notNull(), // array of { lat, lng, serenataId, address, estimatedTime }
  totalDistance: decimal('total_distance', { precision: 10, scale: 2 }), // km
  totalDuration: integer('total_duration'), // minutes
  // Optimization
  optimizationType: varchar('optimization_type', { length: 30 }).default('nearest_neighbor'), // 'nearest_neighbor' | 'manual'
  isOptimized: boolean('is_optimized').notNull().default(false),
  // Status
  status: varchar('status', { length: 20 }).notNull().default('planned'), // 'planned' | 'active' | 'completed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  groupIdx: uniqueIndex('serenata_routes_group_idx').on(table.groupId),
  dateIdx: index('serenata_routes_date_idx').on(table.date),
}));

// Availability slots — for musicians to set weekly availability
export const serenataAvailabilitySlots = pgTable('serenata_availability_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  musicianId: uuid('musician_id').references(() => serenataMusicians.id).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: varchar('start_time', { length: 5 }).notNull(), // 'HH:mm'
  endTime: varchar('end_time', { length: 5 }).notNull(), // 'HH:mm'
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  musicianIdx: index('serenata_availability_musician_idx').on(table.musicianId),
  dayIdx: index('serenata_availability_day_idx').on(table.dayOfWeek),
}));

// Reviews — ratings after completed serenatas
export const serenataReviews = pgTable('serenata_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').references(() => serenataRequests.id).notNull(),
  groupId: uuid('group_id').references(() => serenataGroups.id).notNull(),
  // Reviewer (can be client or musician)
  reviewerType: varchar('reviewer_type', { length: 20 }).notNull(), // 'client' | 'musician'
  reviewerId: varchar('reviewer_id', { length: 255 }).notNull(), // userId or musicianId
  // Ratings
  overallRating: integer('overall_rating').notNull(), // 1-5
  punctualityRating: integer('punctuality_rating'),
  musicQualityRating: integer('music_quality_rating'),
  professionalismRating: integer('professionalism_rating'),
  // Review
  comment: text('comment'),
  // Status
  isPublic: boolean('is_public').notNull().default(false),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  serenataIdx: uniqueIndex('serenata_reviews_serenata_idx').on(table.serenataId, table.reviewerId),
  groupIdx: index('serenata_reviews_group_idx').on(table.groupId),
}));

// Notifications — system notifications for musicians
export const serenataNotifications = pgTable('serenata_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  // Content
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 30 }).notNull(), // 'new_request', 'group_invite', 'route_update', 'payment', 'system'
  // Related entities
  serenataId: uuid('serenata_id').references(() => serenataRequests.id),
  groupId: uuid('group_id').references(() => serenataGroups.id),
  // Status
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  // Push delivery
  pushSent: boolean('push_sent').notNull().default(false),
  pushSentAt: timestamp('push_sent_at'),
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('serenata_notifications_user_idx').on(table.userId),
  unreadIdx: index('serenata_notifications_unread_idx').on(table.userId, table.isRead),
  typeIdx: index('serenata_notifications_type_idx').on(table.type),
  createdAtIdx: index('serenata_notifications_created_idx').on(table.createdAt),
}));
