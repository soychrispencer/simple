import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, decimal, integer, boolean, check, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users, accounts } from './users.js';

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
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda' | 'serenatas'
  planId: varchar('plan_id', { length: 50 }).notNull(), // 'free' | 'pro' | 'enterprise'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('CLP'),
  maxListings: integer('max_listings').notNull().default(0),
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

// Marketplace and Agenda subscriptions belong to a workspace. SimpleSerenatas
// plans belong to the individual provider and use their personal account scope.
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda' | 'serenatas'
  billingProfileType: varchar('billing_profile_type', { length: 20 }), // SimpleSerenatas: 'provider' | 'musician'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'cancelled' | 'paused' | 'expired'
  provider: varchar('provider', { length: 30 }).notNull().default('mercadopago'), // 'mercadopago' | 'manual'
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }), // Provider ID or admin-manual marker
  providerStatus: varchar('provider_status', { length: 50 }), // Provider status or 'manual'
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Next billing date
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  billingProfileTypeCheck: check(
    'subscriptions_billing_profile_type_check',
    sql`(${table.vertical} = 'serenatas' AND ${table.billingProfileType} IN ('provider', 'musician')) OR (${table.vertical} <> 'serenatas' AND ${table.billingProfileType} IS NULL)`,
  ),
  userVerticalIdx: index('subscriptions_user_vertical_idx').on(table.userId, table.vertical),
  accountVerticalIdx: index('subscriptions_account_vertical_idx').on(table.accountId, table.vertical),
  accountVerticalUniqueIdx: uniqueIndex('subscriptions_account_vertical_unique_idx')
    .on(table.accountId, table.vertical)
    .where(sql`${table.accountId} IS NOT NULL AND ${table.vertical} <> 'serenatas'`),
  legacyUserVerticalUniqueIdx: uniqueIndex('subscriptions_user_vertical_legacy_unique_idx')
    .on(table.userId, table.vertical)
    .where(sql`${table.accountId} IS NULL AND ${table.vertical} <> 'serenatas'`),
  serenataBillingProfileUniqueIdx: uniqueIndex('subscriptions_serenatas_profile_unique_idx')
    .on(table.userId, table.billingProfileType)
    .where(sql`${table.vertical} = 'serenatas' AND ${table.billingProfileType} IS NOT NULL`),
  userIdx: index('subscriptions_user_idx').on(table.userId),
  verticalIdx: index('subscriptions_vertical_idx').on(table.vertical),
  providerSubIdx: index('subscriptions_provider_idx').on(table.providerSubscriptionId),
}));

// Payment orders for subscriptions, boosts, advertising, and Serenatas bookings.
export const paymentOrders = pgTable('payment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').references(() => accounts.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  vertical: varchar('vertical', { length: 20 }).notNull(), // 'autos' | 'propiedades' | 'agenda' | 'serenatas'
  kind: varchar('kind', { length: 30 }).notNull(), // 'subscription' | 'boost' | 'advertising' | 'serenata_booking'
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
  accountIdx: index('payment_orders_account_idx').on(table.accountId),
  subscriptionIdx: index('payment_orders_subscription_idx').on(table.subscriptionId),
  providerOrderIdx: index('payment_orders_provider_idx').on(table.providerOrderId),
  statusIdx: index('payment_orders_status_idx').on(table.status),
  kindIdx: index('payment_orders_kind_idx').on(table.kind),
  verticalIdx: index('payment_orders_vertical_idx').on(table.vertical),
}));
