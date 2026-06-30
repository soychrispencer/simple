import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

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
