import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailVerification = typeof emailVerificationsTable.$inferSelect;
