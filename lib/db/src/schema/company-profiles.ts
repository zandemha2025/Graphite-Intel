import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  orgId: integer("org_id").unique(),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  stage: varchar("stage").notNull(),
  revenueRange: varchar("revenue_range").notNull(),
  competitors: text("competitors").notNull().default(""),
  strategicPriorities: text("strategic_priorities").notNull().default(""),
  companyUrl: text("company_url"),
  researchSummary: text("research_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCompanyProfileSchema = insertCompanyProfileSchema.omit({
  userId: true,
}).partial();

export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type UpdateCompanyProfile = z.infer<typeof updateCompanyProfileSchema>;
