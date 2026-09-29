import { Hero } from "@/components/site/hero";
import { Navbar } from "@/components/site/navbar";
import {
  About,
  Coaches,
  Contact,
  Footer,
  News,
  Programs,
  Schedule,
  StatsBand,
  Testimonials,
} from "@/components/site/sections";
import { getPublicContent } from "@/lib/content";
import { getSession } from "@/lib/dal";

export default async function HomePage() {
  const [content, session] = await Promise.all([getPublicContent(), getSession()]);
  const { settings } = content;

  if (!settings) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center text-white/70">
        <p>
          Site content hasn&apos;t been set up yet. Run <code className="text-brand">npm run db:seed</code>.
        </p>
      </main>
    );
  }

  return (
    <>
      <Navbar
        academyName={settings.academyName}
        user={session ? { name: session.user.name, role: session.user.role } : null}
      />
      <main>
        <Hero
          tagline={settings.tagline}
          title={settings.heroTitle}
          subtitle={settings.heroSubtitle}
          students={settings.studentsCount}
          members={content.recentMembers}
          courts={settings.courtsCount}
        />
        <StatsBand settings={settings} />
        <About settings={settings} />
        <Programs programs={content.programs} />
        <Coaches coaches={content.coaches} />
        <Schedule slots={content.slots} />
        <Testimonials items={content.testimonials} />
        <News items={content.announcements} />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
