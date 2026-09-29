import { z } from "zod";
import { SKILL_LEVELS } from "@/lib/constants";

/** Free-form contact number (the academy's own phone on the website). */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{8,16}[0-9]$/, {
    error: "Enter a valid phone number",
  });

// Member mobile numbers: the +91 country code is fixed in the UI, so forms
// submit exactly 10 digits and we store them as "+91XXXXXXXXXX".
export const MOBILE_PREFIX = "+91";
const mobileDigits = z
  .string()
  .trim()
  .regex(/^\d{10}$/, { error: "Enter your 10-digit mobile number" });
const mobileFromForm = mobileDigits.transform((d) => `${MOBILE_PREFIX}${d}`);
const storedMobile = z
  .string()
  .regex(/^\+91\d{10}$/, { error: "Phone must be a 10-digit number with +91" });

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
  phone: storedMobile,
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
    phone: mobileFromForm,
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
  phone: mobileFromForm,
  password: z.string().min(8, { error: "At least 8 characters" }).max(128),
});

export const memberEditSchema = z.object({
  name: text("Name", 80),
  email: z.email({ error: "Enter a valid email" }).transform((e) => e.toLowerCase()),
  phone: mobileFromForm,
  dateOfBirth: z
    .union([z.literal(""), dateOfBirth])
    .optional()
    .transform((v) => v || null),
  skillLevel,
  removePhoto: checkbox,
});

export const testimonialSchema = z.object({
  name: text("Name", 80),
  role: text("Who they are", 80),
  quote: text("Testimonial", 600),
  rating: int("Rating", 1, 5),
  sortOrder: int("Order", 0, 1000),
  isPublished: checkbox,
  removePhoto: checkbox,
});

export const membershipSchema = z
  .object({
    programId: z.coerce.number({ error: "Pick a program" }).int().positive({ error: "Pick a program" }),
    fee: int("Fee", 0, 10_000_000),
    amountPaid: int("Amount paid", 0, 10_000_000),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a start date" })
      .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Pick a valid start date"),
    durationMonths: int("Months", 0, 60),
    durationDays: int("Days", 0, 365),
  })
  .refine((v) => v.durationMonths + v.durationDays > 0, {
    path: ["durationDays"],
    error: "Duration must be at least 1 day",
  })
  .refine((v) => v.amountPaid <= v.fee, {
    path: ["amountPaid"],
    error: "Amount paid can't exceed the fee",
  });

export const PAGE_SIZES =[10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

/** Page size must be a multiple of 10 (min 10, max 100); anything else → 50. */
export function parsePageSize(raw: unknown) {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function parsePage(raw: unknown) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export const promoteByEmailSchema = z.object({
  email: z.email({ error: "Enter a valid email" }),
});
