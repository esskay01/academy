import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db, schema } from "@/lib/db";
import { registrationExtrasSchema } from "@/lib/validations";

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "Bajrang Badminton Academy",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    // Keep in sync with the `user` table in src/lib/db/schema.ts.
    additionalFields: {
      phone: { type: "string", required: true },
      dateOfBirth: { type: "string", required: false },
      skillLevel: { type: "string", required: true, defaultValue: "beginner" },
      // `input: false` → clients can never set their own status; every new
      // registration starts as "pending" and waits in the admin inbox.
      status: {
        type: "string",
        required: false,
        defaultValue: "pending",
        input: false,
      },
      statusUpdatedAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const parsed = registrationExtrasSchema.safeParse(newUser);
          if (!parsed.success) {
            throw new APIError("BAD_REQUEST", {
              message: parsed.error.issues[0]?.message ?? "Invalid details",
            });
          }
          return { data: { ...newUser, ...parsed.data } };
        },
      },
    },
  },
  // `nextCookies` must be the last plugin so cookies set by server-side
  // `auth.api.*` calls (e.g. in Server Actions) reach the browser.
  plugins: [admin(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
