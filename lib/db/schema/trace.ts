import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const decisionTrace = pgTable(
  "decision_trace",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    slug: text("slug").notNull().unique(),
    question: text("question").notNull(),
    title: text("title"),
    projectPath: text("project_path"),
    status: text("status").notNull().default("generating"),
    content: jsonb("content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_trace_owner").on(t.ownerId),
    index("idx_trace_created").on(t.createdAt),
  ]
);
