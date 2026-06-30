import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';

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
