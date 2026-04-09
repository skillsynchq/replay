import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const thread = pgTable(
  "thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    ownerType: text("owner_type").notNull().default("user"),
    slug: text("slug").notNull().unique(),
    visibility: text("visibility").notNull().default("private"),
    title: text("title"),
    agent: text("agent").notNull(),
    model: text("model"),
    sessionId: text("session_id").notNull(),
    projectPath: text("project_path"),
    gitBranch: text("git_branch"),
    sessionTs: timestamp("session_ts", { withTimezone: true }).notNull(),
    cliVersion: text("cli_version"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    keyPoints: text("key_points").array(),

    conversationSnapshot: jsonb("conversation_snapshot"),
    starCount: integer("star_count").notNull().default(0),
    messageCount: integer("message_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_thread_owner_session").on(t.ownerId, t.sessionId),
    index("idx_thread_owner").on(t.ownerId, t.ownerType),
    index("idx_thread_visibility").on(t.visibility),
    index("idx_thread_created").on(t.createdAt),
  ]
);

export const message = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    contentBlocks: jsonb("content_blocks"),
    messageModel: text("message_model"),
    stopReason: text("stop_reason"),
    usage: jsonb("usage"),
    redacted: boolean("redacted").notNull().default(false),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_message_thread_ordinal").on(t.threadId, t.ordinal),
  ]
);

export const threadStar = pgTable(
  "thread_star",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_thread_star_user_thread").on(t.userId, t.threadId),
    index("idx_thread_star_thread").on(t.threadId),
  ]
);

export const threadShare = pgTable(
  "thread_share",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_thread_share_thread_user").on(t.threadId, t.userId),
  ]
);
