import { pgTable, text, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const config = pgTable(
  "config",
  {
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.namespace, t.key] })]
);
