// ============================================================================
// SCHEMA SIMPLIFICADO - SOLO TABLAS ESENCIALES
// De 19 tablas a 8 tablas
// ============================================================================

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, date, time } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../db/schema.js';

// ----------------------------------------------------------------------------
// 1. TABLA CENTRAL: Serenatas
// ----------------------------------------------------------------------------
export const serenatas = pgTable('serenatas', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Cliente que solicita
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 50 }),
  clientEmail: varchar('client_email', { length: 255 }),
  
  // Coordinador asignado (nullable al inicio)
  coordinatorProfileId: uuid('coordinator_profile_id').references(() => serenataCoordinatorProfiles.id),
  groupId: uuid('group_id'), -- Grupo opcional para asignación
  
  // Detalles del evento
  eventType: varchar('event_type', { length: 50 }).notNull().default('serenata'),
  eventDate: date('event_date').notNull(),
  eventTime: time('event_time').notNull(),
  duration: integer('duration').default(30),
  
  // Ubicación
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  
  // Destinatario
  recipientName: varchar('recipient_name', { length: 255 }),
  recipientRelation: varchar('recipient_relation', { length: 50 }),
  message: text('message'),
  songRequests: varchar('song_requests', { length: 255 }).array(),
  
  // Precio y comisiones
  price: integer('price'),
  commission: integer('commission').default(0),
  coordinatorEarnings: integer('coordinator_earnings'),
  
  // Estado y tracking
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  source: varchar('source', { length: 30 }).notNull().default('platform_lead'),
  
  // Timestamps de estado
  quotedAt: timestamp('quoted_at'),
  acceptedAt: timestamp('accepted_at'),
  confirmedAt: timestamp('confirmed_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  coordinatorArrivedAt: timestamp('coordinator_arrived_at'),
  coordinatorDepartedAt: timestamp('coordinator_departed_at'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 2. Perfiles de Coordinadores
// ----------------------------------------------------------------------------
export const serenataCoordinatorProfiles = pgTable('serenata_coordinator_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Información básica (simplificada)
  bio: text('bio'),
  phone: varchar('phone', { length: 50 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  serviceRadius: integer('service_radius').default(50),
  
  // Suscripción (simplificada)
  subscriptionStatus: varchar('subscription_status', { length: 20 }).default('paused'),
  subscriptionStartedAt: timestamp('subscription_started_at'),
  subscriptionEndsAt: timestamp('subscription_ends_at'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 3. Perfiles de Músicos (con cuadrilla integrada)
// ----------------------------------------------------------------------------
export const serenataMusicians = pgTable('serenata_musicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Perfil profesional
  instrument: varchar('instrument', { length: 100 }).default('Voz'),
  bio: text('bio'),
  experience: integer('experience').default(0),
  
  // Disponibilidad
  isAvailable: boolean('is_available').default(true),
  availableNow: boolean('available_now').default(false),
  
  // Cuadrilla (integrado, antes era tabla separada)
  isCrewMember: boolean('is_crew_member').default(false),
  coordinatorProfileId: uuid('coordinator_profile_id').references(() => serenataCoordinatorProfiles.id, { onDelete: 'set null' }),
  crewSince: timestamp('crew_since'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 4. Asignación de Músicos a Serenatas (Lineup)
// ----------------------------------------------------------------------------
export const serenataMusicianLineup = pgTable('serenata_musician_lineup', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').notNull().references(() => serenatas.id, { onDelete: 'cascade' }),
  musicianId: uuid('musician_id').notNull().references(() => serenataMusicians.id, { onDelete: 'cascade' }),
  
  // Instrumento para esta serenata específica
  instrument: varchar('instrument', { length: 100 }),
  
  // Confirmación
  invitationSentAt: timestamp('invitation_sent_at'),
  respondedAt: timestamp('responded_at'),
  status: varchar('status', { length: 20 }).default('pending'), -- pending, accepted, declined, confirmed
  
  // Tracking día del evento
  arrivedAt: timestamp('arrived_at'),
  departedAt: timestamp('departed_at'),
  
  // Pago
  paymentAmount: integer('payment_amount'),
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 5. Grupos (simplificados, sin assignments separados)
// ----------------------------------------------------------------------------
export const serenataGroups = pgTable('serenata_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  coordinatorProfileId: uuid('coordinator_profile_id').notNull().references(() => serenataCoordinatorProfiles.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).default('forming'), -- forming, confirmed, completed
  
  // Ruta optimizada (antes era tabla separada)
  routeOptimized: boolean('route_optimized').default(false),
  routeData: jsonb('route_data'), -- { waypoints: [...], totalDistance: 12.5, estimatedDuration: 45 }
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 6. Miembros de Grupos (simplificado)
// ----------------------------------------------------------------------------
export const serenataGroupMembers = pgTable('serenata_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => serenataGroups.id, { onDelete: 'cascade' }),
  musicianId: uuid('musician_id').notNull().references(() => serenataMusicians.id, { onDelete: 'cascade' }),
  
  position: integer('position').default(0),
  instrument: varchar('instrument', { length: 100 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 7. Reviews (unificado)
// ----------------------------------------------------------------------------
export const serenataReviews = pgTable('serenata_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').notNull().references(() => serenatas.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => serenataGroups.id, { onDelete: 'cascade' }),
  
  // Quién evalúa
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  reviewType: varchar('review_type', { length: 20 }).default('client_to_group'), -- client_to_group, coordinator_to_musician
  
  // Evaluación
  rating: integer('rating').notNull(), -- 1-5
  punctualityRating: integer('punctuality_rating'),
  performanceRating: integer('performance_rating'),
  communicationRating: integer('communication_rating'),
  comment: text('comment'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// 8. Suscripciones y Pagos (simplificado)
// ----------------------------------------------------------------------------
export const serenataSubscriptions = pgTable('serenata_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  coordinatorProfileId: uuid('coordinator_profile_id').notNull().references(() => serenataCoordinatorProfiles.id),
  
  plan: varchar('plan', { length: 50 }).default('coordinator'),
  status: varchar('status', { length: 20 }).default('active'), -- active, paused, cancelled, expired
  priceMonthly: integer('price_monthly').default(4990),
  
  startsAt: timestamp('starts_at').notNull().defaultNow(),
  endsAt: timestamp('ends_at'),
  
  mpPreapprovalId: varchar('mp_preapproval_id', { length: 255 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const serenataPayments = pgTable('serenata_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serenataId: uuid('serenata_id').notNull().references(() => serenatas.id, { onDelete: 'cascade' }),
  
  amount: integer('amount').notNull(),
  platformFee: integer('platform_fee').default(0),
  coordinatorEarnings: integer('coordinator_earnings'),
  
  status: varchar('status', { length: 20 }).default('pending'), -- pending, holding, released, refunded
  mpPaymentId: varchar('mp_payment_id', { length: 255 }),
  mpPreferenceId: varchar('mp_preference_id', { length: 255 }),
  
  paidAt: timestamp('paid_at'),
  releasedAt: timestamp('released_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// RELACIONES
// ----------------------------------------------------------------------------
export const serenatasRelations = relations(serenatas, ({ one, many }) => ({
  client: one(users, { fields: [serenatas.clientId], references: [users.id] }),
  coordinatorProfile: one(serenataCoordinatorProfiles, { fields: [serenatas.coordinatorProfileId], references: [serenataCoordinatorProfiles.id] }),
  group: one(serenataGroups, { fields: [serenatas.groupId], references: [serenataGroups.id] }),
  lineup: many(serenataMusicianLineup),
  reviews: many(serenataReviews),
  payments: many(serenataPayments),
}));

export const serenataCoordinatorProfilesRelations = relations(serenataCoordinatorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [serenataCoordinatorProfiles.userId], references: [users.id] }),
  serenatas: many(serenatas),
  crewMembers: many(serenataMusicians),
  groups: many(serenataGroups),
  subscriptions: many(serenataSubscriptions),
}));

export const serenataMusiciansRelations = relations(serenataMusicians, ({ one, many }) => ({
  user: one(users, { fields: [serenataMusicians.userId], references: [users.id] }),
  coordinator: one(serenataCoordinatorProfiles, { fields: [serenataMusicians.coordinatorProfileId], references: [serenataCoordinatorProfiles.id] }),
  lineups: many(serenataMusicianLineup),
  groupMemberships: many(serenataGroupMembers),
}));
