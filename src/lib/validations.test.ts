import { describe, expect, it } from "vitest";
import {
  coachSchema,
  parsePageSize,
  registerFormSchema,
  registrationExtrasSchema,
  slotSchema,
} from "@/lib/validations";

const validRegistration = {
  name: "Saina Sharma",
  email: "saina@example.com",
  phone: "9876543210",
  dateOfBirth: "2010-05-14",
  skillLevel: "beginner",
  password: "supersecret",
  confirmPassword: "supersecret",
};

describe("registerFormSchema", () => {
  it("accepts a complete registration", () => {
    expect(registerFormSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects mismatched passwords on confirmPassword", () => {
    const r = registerFormSchema.safeParse({ ...validRegistration, confirmPassword: "nope" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("rejects future dates of birth", () => {
    expect(registerFormSchema.safeParse({ ...validRegistration, dateOfBirth: "2999-01-01" }).success).toBe(false);
  });

  it("requires exactly 10 phone digits and stores them with +91", () => {
    expect(registerFormSchema.parse(validRegistration).phone).toBe("+919876543210");
    for (const phone of ["987654321", "98765432101", "+919876543210", "98765 43210", "98765abcde"]) {
      expect(registerFormSchema.safeParse({ ...validRegistration, phone }).success, phone).toBe(false);
    }
  });
});

describe("registrationExtrasSchema (server-side sign-up hook)", () => {
  it("normalises an empty date of birth to null", () => {
    const r = registrationExtrasSchema.parse({ phone: "+919876543210", skillLevel: "advanced", dateOfBirth: "" });
    expect(r.dateOfBirth).toBeNull();
  });

  it("rejects unknown skill levels", () => {
    expect(registrationExtrasSchema.safeParse({ phone: "+919876543210", skillLevel: "wizard" }).success).toBe(false);
  });
});

describe("parsePageSize", () => {
  it("accepts multiples of 10 from 10 to 100 and defaults to 50", () => {
    expect(parsePageSize("10")).toBe(10);
    expect(parsePageSize("100")).toBe(100);
    for (const bad of [undefined, "0", "5", "15", "110", "abc"]) expect(parsePageSize(bad)).toBe(50);
  });
});

describe("admin content schemas", () => {
  it("splits coach specialties by line or comma and reads checkboxes", () => {
    const r = coachSchema.parse({
      name: "Arjun",
      title: "Coach",
      bio: "Bio",
      specialties: "Smash\nDefence, Footwork",
      experienceYears: "5",
      sortOrder: "0",
      isActive: "on",
    });
    expect(r.specialties).toEqual(["Smash", "Defence", "Footwork"]);
    expect(r.isActive).toBe(true);
    expect(r.photoUrl).toBeNull();
  });

  it("requires slot end time after start and enrolled ≤ capacity", () => {
    const base = { title: "A", days: "Mon", level: "beginner", capacity: "10", enrolled: "2", sortOrder: "0" };
    expect(slotSchema.safeParse({ ...base, startTime: "08:00", endTime: "07:00" }).success).toBe(false);
    expect(slotSchema.safeParse({ ...base, startTime: "06:00", endTime: "07:00", enrolled: "11" }).success).toBe(false);
    const ok = slotSchema.parse({ ...base, startTime: "06:00", endTime: "07:00", coachId: "" });
    expect(ok.coachId).toBeNull();
    expect(ok.isActive).toBe(false);
  });
});
