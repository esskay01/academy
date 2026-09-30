import { Hero } from "@/components/site/hero";
import { Navbar } from "@/components/site/navbar";
import { SiteChrome } from "@/components/site/site-chrome";
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
          Site content hasn&apos;t been set up yet. Run <code className="text-brand-text">npm run db:seed</code>.
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
      <main id="main">
        <Hero
          tagline={settings.tagline}
          title={settings.heroTitle}
          subtitle={settings.heroSubtitle}
          students={settings.studentsCount}
          members={content.recentMembers}
          courts={settings.courtsCount}
          chips={[
            { label: settings.heroChip1Label, value: settings.heroChip1Value },
            { label: settings.heroChip2Label, value: settings.heroChip2Value },
          ]}
        />
        <StatsBand settings={settings} />
        <div className="h-14 sm:h-20" aria-hidden />
        <Testimonials items={content.testimonials} />
        <About settings={settings} />
        <Programs programs={content.programs} />
        <Coaches coaches={content.coaches} />
        <Schedule slots={content.slots} />
        <News items={content.announcements} />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
      <SiteChrome whatsapp={settings.whatsapp} />
    </>
  );
}
