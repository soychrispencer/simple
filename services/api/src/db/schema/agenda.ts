import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users, accounts } from './users.js';

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

/** Same table as monolith schema — Relationship Engine timeline. */
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
