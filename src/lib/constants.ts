// Shared by the DB schema, validation and client components. Keep this file
// dependency-free so importing it never drags server code into the browser.

export const USER_STATUSES = ["pending", "active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SKILL_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "professional",
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
