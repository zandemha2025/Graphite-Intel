import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Per-resource sharing. Grants access to individual resources
 * beyond what org-level RBAC provides.
 */
export const resourceShares = pgTable(
  "resource_shares",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 50 }).notNull(), // "document" | "report" | "conversation" | "vault_project" | "workflow"
    resourceId: integer("resource_id").notNull(),
    sharedByUserId: varchar("shared_by_user_id").notNull(),
    sharedWithUserId: varchar("shared_with_user_id"), // NULL if shared with guest
    sharedWithEmail: varchar("shared_with_email", { length: 255 }), // For guest access
    permission: varchar("permission", { length: 20 }).notNull().default("read"), // "read" | "edit" | "comment"
    isActive: boolean("is_active").default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // For time-limited shares
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_share_org").on(table.orgId),
    index("idx_share_resource").on(table.resourceType, table.resourceId),
    index("idx_share_user").on(table.sharedWithUserId),
    index("idx_share_email").on(table.sharedWithEmail),
  ],
);

/**
 * Comments and annotations on any resource.
 */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id").notNull(),
    parentId: integer("parent_id"), // For threaded replies (self-referencing)
    userId: varchar("user_id").notNull(),
    content: text("content").notNull(),
    anchor: jsonb("anchor"), // Position anchor for annotations: { page, offset, selection }
    isResolved: boolean("is_resolved").default(false),
    resolvedByUserId: varchar("resolved_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_comment_resource").on(table.resourceType, table.resourceId),
    index("idx_comment_parent").on(table.parentId),
    index("idx_comment_user").on(table.userId),
  ],
);

/**
 * Guest access tokens — external users with limited scope.
 */
export const guestTokens = pgTable(
  "guest_tokens",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }),
    token: varchar("token", { length: 128 }).notNull(),
    isActive: boolean("is_active").default(true),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_guest_token").on(table.token),
    index("idx_guest_org_email").on(table.orgId, table.email),
  ],
);

/**
 * Activity feed for org-wide visibility.
 */
export const activityFeed = pgTable(
  "activity_feed",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(), // "created" | "updated" | "commented" | "shared" | "completed"
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id").notNull(),
    resourceTitle: text("resource_title"),
    metadata: jsonb("metadata"), // Action-specific details
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_activity_org").on(table.orgId),
    index("idx_activity_created").on(table.createdAt),
    index("idx_activity_user").on(table.userId),
  ],
);

/**
 * Presence tracking for real-time collaboration.
 * Ephemeral — rows are cleaned up when users disconnect.
 */
export const userPresence = pgTable(
  "user_presence",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: integer("resource_id"),
    status: varchar("status", { length: 20 }).default("online"), // "online" | "away" | "viewing"
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_presence_user_resource").on(table.userId, table.resourceType, table.resourceId),
    index("idx_presence_resource").on(table.resourceType, table.resourceId),
  ],
);

// Insert schemas
export const insertResourceShareSchema = createInsertSchema(resourceShares).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuestTokenSchema = createInsertSchema(guestTokens).omit({ id: true, createdAt: true, lastAccessedAt: true });

// Types
export type ResourceShare = typeof resourceShares.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type GuestToken = typeof guestTokens.$inferSelect;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type UserPresence = typeof userPresence.$inferSelect;
