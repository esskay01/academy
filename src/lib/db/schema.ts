import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { SKILL_LEVELS, USER_STATUSES } from "../constants";

export { SKILL_LEVELS, USER_STATUSES };
export type { SkillLevel, UserStatus } from "../constants";

// ---------------------------------------------------------------------------
// Better Auth tables (core + admin plugin fields + our additionalFields).
// Keep in sync with `user.additionalFields` in src/lib/auth.ts.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // admin plugin
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  // academy fields
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  skillLevel: text("skill_level", { enum: SKILL_LEVELS })
    .notNull()
    .default("beginner"),
  status: text("status", { enum: USER_STATUSES }).notNull().default("pending"),
  statusUpdatedAt: timestamp("status_updated_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Admin-editable website content
// ---------------------------------------------------------------------------

/** Single-row table (id is always 1). */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  academyName: text("academy_name").notNull(),
  tagline: text("tagline").notNull(),
  heroTitle: text("hero_title").notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  aboutText: text("about_text").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp"),
  address: text("address").notNull(),
  mapEmbedUrl: text("map_embed_url"),
  openingHours: text("opening_hours").notNull(),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  youtubeUrl: text("youtube_url"),
  courtsCount: integer("courts_count").notNull().default(0),
  studentsCount: integer("students_count").notNull().default(0),
  yearsRunning: integer("years_running").notNull().default(0),
  titlesWon: integer("titles_won").notNull().default(0),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  experienceYears: integer("experience_years").notNull().default(0),
  photoUrl: text("photo_url"),
  achievements: text("achievements"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainingSlots = pgTable("training_slots", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  days: text("days").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  level: text("level", { enum: SKILL_LEVELS }).notNull(),
  capacity: integer("capacity").notNull(),
  enrolled: integer("enrolled").notNull().default(0),
  coachId: integer("coach_id").references(() => coaches.id, {
    onDelete: "set null",
  }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  features: text("features").array().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tag: text("tag"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof user.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Coach = typeof coaches.$inferSelect;
export type TrainingSlot = typeof trainingSlots.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
