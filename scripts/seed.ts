/**
 * Idempotent seed: creates the first admin (from ADMIN_* env vars) and starter
 * website content. Safe to run on every deploy — existing data is left alone.
 */
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  announcements,
  coaches,
  programs,
  siteSettings,
  testimonials,
  trainingSlots,
  user,
} from "@/lib/db/schema";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Academy Admin";
  if (!email || !password) {
    console.log("• ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }

  const [existing] = await db.select().from(user).where(eq(user.email, email));
  if (!existing) {
    await auth.api.signUpEmail({
      body: { name, email, password, phone: "+919000000000", skillLevel: "professional" },
    });
  }
  await db
    .update(user)
    .set({ role: "admin", status: "active", statusUpdatedAt: new Date() })
    .where(eq(user.email, email));
  console.log(`• admin ready: ${email}${existing ? " (already existed)" : ""}`);
}

async function isEmpty(table: typeof coaches | typeof programs | typeof trainingSlots | typeof announcements | typeof testimonials) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(table);
  return count === 0;
}

async function seedContent() {
  await db
    .insert(siteSettings)
    .values({
      id: 1,
      academyName: "Bajrang Badminton Academy",
      tagline: "Where champions take flight",
      heroTitle: "Smash limits. Rally harder. Rise faster.",
      heroSubtitle:
        "World-class coaching, pro-grade wooden courts and a community that pushes you further — for kids, adults and competitive players.",
      aboutText:
        "Founded by former state-level players, Bajrang Badminton Academy blends structured technique training, footwork science and match play. Every batch is small, every player gets a personal progress plan, and every session is led by certified coaches.",
      phone: "+91 98765 43210",
      email: "hello@bajrangbadminton.in",
      whatsapp: "+919876543210",
      address: "Plot 21, Sports Complex Road, Sector 14, Pune, Maharashtra 411001",
      mapEmbedUrl: null,
      openingHours: "Mon–Sat 5:30 AM – 10:00 PM · Sun 6:00 AM – 12:00 PM",
      instagramUrl: "https://instagram.com",
      facebookUrl: "https://facebook.com",
      youtubeUrl: "https://youtube.com",
      courtsCount: 8,
      studentsCount: 450,
      yearsRunning: 12,
      titlesWon: 120,
    })
    .onConflictDoNothing();

  if (await isEmpty(coaches)) {
    await db.insert(coaches).values([
      {
        name: "Bajrang Singh",
        title: "Head Coach & Founder",
        bio: "Former national-level singles player with a passion for building fundamentals that last a lifetime.",
        specialties: ["Singles strategy", "Footwork", "Mental game"],
        experienceYears: 18,
        achievements: "BWF Level 2 certified · 3× state champion",
        sortOrder: 1,
      },
      {
        name: "Priya Deshmukh",
        title: "Senior Coach — Juniors",
        bio: "Specialises in turning curious kids into confident competitors through play-based drills.",
        specialties: ["Junior development", "Net play", "Agility"],
        experienceYears: 10,
        achievements: "Coached 40+ district medalists",
        sortOrder: 2,
      },
      {
        name: "Arjun Mehta",
        title: "Performance Coach — Doubles",
        bio: "Doubles specialist focused on rotations, fast drives and killer serve-return patterns.",
        specialties: ["Doubles rotation", "Smash power", "Defence"],
        experienceYears: 8,
        achievements: "All-India university doubles gold",
        sortOrder: 3,
      },
    ]);
  }

  if (await isEmpty(trainingSlots)) {
    const coachRows = await db.select({ id: coaches.id }).from(coaches).orderBy(coaches.sortOrder);
    const [c1, c2, c3] = coachRows.map((c) => c.id);
    await db.insert(trainingSlots).values([
      { title: "Sunrise Juniors", days: "Mon · Wed · Fri", startTime: "06:00", endTime: "07:30", level: "beginner", capacity: 20, enrolled: 14, coachId: c2, sortOrder: 1 },
      { title: "Early Pro Squad", days: "Mon – Sat", startTime: "05:30", endTime: "07:30", level: "advanced", capacity: 12, enrolled: 11, coachId: c1, sortOrder: 2 },
      { title: "After-School Stars", days: "Tue · Thu · Sat", startTime: "16:30", endTime: "18:00", level: "intermediate", capacity: 18, enrolled: 9, coachId: c2, sortOrder: 3 },
      { title: "Doubles Power Hour", days: "Mon · Wed · Fri", startTime: "18:30", endTime: "20:00", level: "intermediate", capacity: 16, enrolled: 12, coachId: c3, sortOrder: 4 },
      { title: "Adult Fitness Rally", days: "Tue · Thu", startTime: "20:00", endTime: "21:30", level: "beginner", capacity: 20, enrolled: 6, coachId: c3, sortOrder: 5 },
    ]);
  }

  if (await isEmpty(programs)) {
    await db.insert(programs).values([
      {
        name: "Starter",
        description: "Learn grips, footwork and the joy of the game.",
        priceMonthly: 2500,
        features: ["3 sessions / week", "Racket & shuttle provided", "Monthly progress report"],
        sortOrder: 1,
      },
      {
        name: "Competitor",
        description: "Structured training for tournament-bound players.",
        priceMonthly: 4500,
        features: ["6 sessions / week", "Video match analysis", "Fitness & agility block", "Tournament guidance"],
        isFeatured: true,
        sortOrder: 2,
      },
      {
        name: "Elite 1-on-1",
        description: "Personal coaching tailored to your game.",
        priceMonthly: 9000,
        features: ["8 private sessions", "Custom training plan", "Nutrition consultation", "Priority court booking"],
        sortOrder: 3,
      },
    ]);
  }

  if (await isEmpty(announcements)) {
    await db.insert(announcements).values([
      { title: "Summer Camp 2026 registrations open", body: "Four weeks of intensive training for ages 8–16. Limited seats — register and mention 'Summer Camp'.", tag: "Camp" },
      { title: "Inter-academy tournament on 18 October", body: "Singles and doubles categories for U-13, U-17 and Open. Entries close 10 October.", tag: "Tournament" },
      { title: "New synthetic mats on courts 5–8", body: "BWF-approved mats installed for better grip and fewer injuries.", tag: "Facility" },
    ]);
  }
  if (await isEmpty(testimonials)) {
    await db.insert(testimonials).values([
      { name: "Meera Kulkarni", role: "Parent of a U-13 player", quote: "My daughter joined as a complete beginner. Eight months later she won her first district medal. The coaches genuinely care.", rating: 5, sortOrder: 1 },
      { name: "Rohan Patil", role: "Competitor batch", quote: "The video analysis sessions changed my doubles game completely. My rotations are finally automatic.", rating: 5, sortOrder: 2 },
      { name: "Anita Joshi", role: "Adult Fitness Rally", quote: "Best part of my week. Great workout, friendly group and coaches who correct technique without making you feel slow.", rating: 4, sortOrder: 3 },
    ]);
  }
  console.log("• site content ready");
}

async function main() {
  await seedContent();
  await seedAdmin();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
