import { z } from "zod";
import { SKILL_LEVELS } from "@/lib/constants";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{8,16}[0-9]$/, {
    error: "Enter a valid phone number",
  });

const dateOfBirth = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use the date picker (YYYY-MM-DD)" })
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d < new Date() && d.getUTCFullYear() > 1920;
  }, "Enter a valid date of birth");

const skillLevel = z.enum(SKILL_LEVELS, { error: "Pick a skill level" });

/** Server-side check for the academy fields Better Auth receives on sign-up. */
export const registrationExtrasSchema = z.object({
  phone,
  dateOfBirth: z
    .union([z.literal(""), dateOfBirth])
    .nullish()
    .transform((v) => v || null),
  skillLevel,
});

export const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Tell us your full name" }).max(80),
    email: z.email({ error: "Enter a valid email" }),
    phone,
    dateOfBirth,
    skillLevel,
    password: z.string().min(8, { error: "At least 8 characters" }).max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords don't match",
  });
export type RegisterForm = z.infer<typeof registerFormSchema>;

export const loginFormSchema = z.object({
  email: z.email({ error: "Enter a valid email" }),
  password: z.string().min(1, { error: "Enter your password" }),
});

// ---------------------------------------------------------------------------
// Admin forms (parsed from FormData in Server Actions)
// ---------------------------------------------------------------------------

const text = (label: string, max = 200) =>
  z.string().trim().min(1, { error: `${label} is required` }).max(max);

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const optionalUrl = z
  .union([z.literal(""), z.url({ error: "Enter a full URL (https://…)" })])
  .optional()
  .transform((v) => v || null);

/** Accepts one item per line (or comma separated) and returns a clean list. */
const list = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const int = (label: string, min = 0, max = 100_000) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int({ error: `${label} must be a whole number` })
    .min(min, { error: `${label} must be at least ${min}` })
    .max(max, { error: `${label} is too large` });

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use HH:MM (24h)" });

export const idSchema = z.coerce.number().int().positive();

export const coachSchema = z.object({
  name: text("Name", 80),
  title: text("Title", 80),
  bio: text("Bio", 1000),
  specialties: list,
  experienceYears: int("Experience", 0, 70),
  photoUrl: optionalUrl,
  achievements: optionalText(500),
  sortOrder: int("Order", 0, 1000),
  isActive: checkbox,
});

export const slotSchema = z
  .object({
    title: text("Title", 80),
    days: text("Days", 80),
    startTime: time,
    endTime: time,
    level: skillLevel,
    capacity: int("Capacity", 1, 500),
    enrolled: int("Enrolled", 0, 500),
    coachId: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null)),
    sortOrder: int("Order", 0, 1000),
    isActive: checkbox,
  })
  .refine((v) => v.startTime < v.endTime, {
    path: ["endTime"],
    error: "End time must be after start time",
  })
  .refine((v) => v.enrolled <= v.capacity, {
    path: ["enrolled"],
    error: "Enrolled can't exceed capacity",
  });

export const programSchema = z.object({
  name: text("Name", 80),
  description: text("Description", 500),
  priceMonthly: int("Price", 0, 1_000_000),
  features: list,
  isFeatured: checkbox,
  isActive: checkbox,
  sortOrder: int("Order", 0, 1000),
});

export const announcementSchema = z.object({
  title: text("Title", 120),
  body: text("Message", 2000),
  tag: optionalText(30),
  isPublished: checkbox,
});

export const settingsSchema = z.object({
  academyName: text("Academy name", 80),
  tagline: text("Tagline", 120),
  heroTitle: text("Hero title", 120),
  heroSubtitle: text("Hero subtitle", 400),
  aboutText: text("About", 2000),
  phone,
  email: z.email({ error: "Enter a valid email" }),
  whatsapp: optionalText(20),
  address: text("Address", 300),
  mapEmbedUrl: optionalUrl,
  openingHours: text("Opening hours", 200),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  courtsCount: int("Courts", 0, 1000),
  studentsCount: int("Students", 0, 1_000_000),
  yearsRunning: int("Years", 0, 200),
  titlesWon: int("Titles", 0, 100_000),
});

export const createAdminSchema = z.object({
  name: text("Name", 80),
  email: z.email({ error: "Enter a valid email" }),
  phone,
  password: z.string().min(8, { error: "At least 8 characters" }).max(128),
});

export const promoteByEmailSchema = z.object({
  email: z.email({ error: "Enter a valid email" }),
});
