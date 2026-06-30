import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';

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
