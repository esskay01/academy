import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db, schema } from "@/lib/db";
import { BLOOD_GROUPS } from "@/lib/constants";
import { registrationExtrasSchema, signUpBloodGroupSchema } from "@/lib/validations";

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Which header holds the real client IP (used for sign-in rate limiting).
// Production sets "cf-connecting-ip": Cloudflare writes it and the app is only
// reachable through the tunnel, so it can't be spoofed. Unset = library default.
const ipHeader = process.env.CLIENT_IP_HEADER?.trim();

export const auth = betterAuth({
  appName: "Bajrang Badminton Academy",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins,
  advanced: ipHeader ? { ipAddress: { ipAddressHeaders: [ipHeader] } } : undefined,
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
      // Required on public sign-up (enforced in hooks.before below); optional for
      // the seed admin and admin-created admins.
      bloodGroup: { type: "string", required: false },
      // Issued by a DB trigger on first activation; never client-settable.
      memberCode: { type: "string", required: false, input: false },
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
      update: {
        before: async (data) => {
          // Users can edit their own fields via /update-user; keep blood group valid.
          if ("bloodGroup" in data && data.bloodGroup != null && !(BLOOD_GROUPS as readonly unknown[]).includes(data.bloodGroup)) {
            throw new APIError("BAD_REQUEST", { message: "Select a valid blood group" });
          }
          return { data };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Blood group is printed on the member ID card, so self-registration must supply it.
      // Only HTTP requests: server-side auth.api calls (the seed admin) have no request.
      if (ctx.path !== "/sign-up/email" || !ctx.request) return;
      const parsed = signUpBloodGroupSchema.safeParse(ctx.body ?? {});
      if (!parsed.success) {
        throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]?.message ?? "Select your blood group" });
      }
    }),
  },
  // `nextCookies` must be the last plugin so cookies set by server-side
  // `auth.api.*` calls (e.g. in Server Actions) reach the browser.
  plugins: [admin(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
