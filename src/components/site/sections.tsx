import Image from "next/image";
import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  Clock,
  Dumbbell,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Quote,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { FacebookIcon, InstagramIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { CountUp, Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/site/section";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import type { Announcement, Coach, Program, SiteSettings, Testimonial } from "@/lib/db/schema";
import type { PublicSlot } from "@/lib/content";
import { capitalize, cn, formatDate, formatINR, formatTime, initials } from "@/lib/utils";

export function StatsBand({ settings }: { settings: SiteSettings }) {
  const stats = [
    { label: "Active players", value: settings.studentsCount, suffix: "+" },
    { label: "Pro-grade courts", value: settings.courtsCount, suffix: "" },
    { label: "Years of coaching", value: settings.yearsRunning, suffix: "" },
    { label: "Titles won", value: settings.titlesWon, suffix: "+" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="glass grid grid-cols-2 divide-white/10 rounded-3xl lg:grid-cols-4 lg:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="p-8 text-center">
            <p className="font-display text-gradient text-4xl font-extrabold sm:text-5xl">
              <CountUp to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm text-white/55">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  { icon: Target, title: "Technique first", text: "Grip, stance and stroke mechanics drilled until they're second nature." },
  { icon: Activity, title: "Footwork science", text: "Court-coverage patterns and agility ladders built for explosive movement." },
  { icon: Dumbbell, title: "Strength & conditioning", text: "Badminton-specific fitness that builds power while preventing injury." },
  { icon: ShieldCheck, title: "Safe, pro facility", text: "BWF-approved mats, bright LED lighting and certified first-aid staff." },
];

export function About({ settings }: { settings: SiteSettings }) {
  return (
    <Section id="about">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionHeading align="left" eyebrow="Why Bajrang" title={<>Built to make you <span className="text-gradient">play better</span></>} />
          <Reveal>
            <p className="-mt-6 text-lg leading-relaxed text-white/65">{settings.aboutText}</p>
          </Reveal>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="group card-hover glass h-full rounded-3xl p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/25 to-cyan-400/10 text-brand transition group-hover:scale-110">
                  <f.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Programs({ programs }: { programs: Program[] }) {
  if (programs.length === 0) return null;
  return (
    <Section id="programs">
      <SectionHeading eyebrow="Programs" title="Pick your pace" description="Transparent monthly plans. No joining fee for your first month." />
      <div className="grid gap-6 lg:grid-cols-3">
        {programs.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div
              className={cn(
                "card-hover relative flex h-full flex-col rounded-3xl p-8",
                p.isFeatured ? "bg-gradient-to-b from-brand/20 via-surface to-surface ring-2 ring-brand/60" : "glass",
              )}
            >
              {p.isFeatured && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-bold text-ink">Most popular</span>
              )}
              <h3 className="font-display text-2xl font-bold text-white">{p.name}</h3>
              <p className="mt-2 text-sm text-white/55">{p.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold text-white">{formatINR(p.priceMonthly)}</span>
                <span className="text-sm text-white/50">/month</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/register" variant={p.isFeatured ? "primary" : "secondary"} className="mt-8 w-full">
                Get started
              </LinkButton>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const avatarGradients = [
  "from-brand via-lime-400 to-emerald-500",
  "from-cyan-300 via-sky-400 to-indigo-500",
  "from-ember via-orange-400 to-rose-500",
  "from-violet-300 via-fuchsia-400 to-pink-500",
];

export function Coaches({ coaches }: { coaches: Coach[] }) {
  if (coaches.length === 0) return null;
  return (
    <Section id="coaches" className="bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
      <SectionHeading eyebrow="Our coaches" title="Learn from people who've been there" description="Certified, experienced and obsessed with your progress." />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.08}>
            <article className="group card-hover glass h-full overflow-hidden rounded-3xl">
              <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", avatarGradients[i % avatarGradients.length])}>
                {c.photoUrl ? (
                  <Image src={c.photoUrl} alt={c.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <span className="font-display absolute inset-0 grid place-items-center text-7xl font-extrabold text-ink/80 transition duration-700 group-hover:scale-110">
                    {initials(c.name)}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                <span className="absolute right-4 bottom-4 rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {c.experienceYears}+ yrs
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-white">{c.name}</h3>
                <p className="text-sm font-medium text-brand">{c.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{c.bio}</p>
                {c.achievements && (
                  <p className="mt-4 flex items-start gap-2 text-xs text-amber-200/90">
                    <Award className="mt-0.5 size-4 shrink-0" /> {c.achievements}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.specialties.map((s) => (
                    <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">{s}</span>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const levelColors: Record<string, string> = {
  beginner: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
  intermediate: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
  advanced: "text-amber-200 bg-amber-400/10 border-amber-400/25",
  professional: "text-rose-300 bg-rose-400/10 border-rose-400/25",
};

export function Schedule({ slots }: { slots: PublicSlot[] }) {
  if (slots.length === 0) return null;
  return (
    <Section id="schedule">
      <SectionHeading eyebrow="Available slots" title={<>Find a batch that <span className="text-gradient">fits your day</span></>} description="Seats update live — grab yours before the batch fills up." />
      <div className="grid gap-4 md:grid-cols-2">
        {slots.map((s, i) => {
          const left = Math.max(0, s.capacity - s.enrolled);
          const pct = Math.min(100, Math.round((s.enrolled / s.capacity) * 100));
          return (
            <Reveal key={s.id} delay={(i % 2) * 0.08}>
              <div className="card-hover glass flex h-full flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center">
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white/10 to-white/0 text-center">
                  <div>
                    <p className="font-display text-xl font-bold text-white">{formatTime(s.startTime).replace(/ (AM|PM)/, "")}</p>
                    <p className="text-[10px] font-bold tracking-widest text-white/50">{formatTime(s.startTime).slice(-2)}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", levelColors[s.level])}>{capitalize(s.level)}</span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{s.days}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
                    {s.coachName && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />{s.coachName}</span>}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className={cn("h-full rounded-full", left === 0 ? "bg-rose-400" : pct > 75 ? "bg-amber-300" : "bg-brand")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn("text-xs font-semibold whitespace-nowrap", left === 0 ? "text-rose-300" : left <= 3 ? "text-amber-200" : "text-white/70")}>
                      {left === 0 ? "Batch full" : `${left} spots left`}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function News({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  return (
    <Section id="news">
      <SectionHeading eyebrow="What's new" title="Academy updates" />
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((a, i) => (
          <Reveal key={a.id} delay={i * 0.08}>
            <article className="card-hover glass h-full rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ember/15 px-2.5 py-1 text-xs font-semibold text-orange-200">
                  <Megaphone className="size-3.5" /> {a.tag ?? "News"}
                </span>
                <time className="text-xs text-white/40">{formatDate(a.createdAt)}</time>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{a.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Contact({ settings }: { settings: SiteSettings }) {
  const items = [
    { icon: Phone, label: "Call us", value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}` },
    { icon: MapPin, label: "Visit", value: settings.address },
    { icon: Clock, label: "Hours", value: settings.openingHours },
  ];
  return (
    <Section id="contact">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-brand/15 via-surface to-cyan-500/10 p-8 sm:p-14">
        <div aria-hidden className="court-grid absolute inset-0 opacity-30" />
        <div className="relative grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] text-brand uppercase">Contact</p>
            <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Ready to step on court?</h2>
            <p className="mt-4 max-w-md text-lg text-white/65">Register online in two minutes. Our team reviews every application and activates your membership within 24 hours.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">Register now <ArrowRight className="size-4" /></LinkButton>
              {settings.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-6 font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => {
              const body = (
                <>
                  <it.icon className="size-5 text-brand" />
                  <p className="mt-3 text-xs font-semibold tracking-wider text-white/45 uppercase">{it.label}</p>
                  <p className="mt-1 text-sm font-medium break-words text-white">{it.value}</p>
                </>
              );
              return it.href ? (
                <a key={it.label} href={it.href} className="card-hover glass rounded-2xl p-5">{body}</a>
              ) : (
                <div key={it.label} className="glass rounded-2xl p-5">{body}</div>
              );
            })}
          </div>
        </div>
        {settings.mapEmbedUrl && (
          <iframe
            src={settings.mapEmbedUrl}
            title="Academy location"
            className="relative mt-10 h-72 w-full rounded-2xl border border-white/10 grayscale-[40%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </Section>
  );
}

export function Footer({ settings }: { settings: SiteSettings }) {
  const socials = [
    { href: settings.instagramUrl, icon: InstagramIcon, label: "Instagram" },
    { href: settings.facebookUrl, icon: FacebookIcon, label: "Facebook" },
    { href: settings.youtubeUrl, icon: YoutubeIcon, label: "YouTube" },
  ].filter((s) => s.href);
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/45 sm:flex-row">
        <p>© {new Date().getFullYear()} {settings.academyName}. {settings.tagline}.</p>
        <div className="flex gap-2">
          {socials.map((s) => (
            <a key={s.label} href={s.href!} target="_blank" rel="noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-brand/40 hover:text-brand">
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <Section id="testimonials">
      <SectionHeading eyebrow="Testimonials" title={<>Heard <span className="text-gradient">on court</span></>} description="Players and parents on what training at the academy feels like." />
      <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {items.map((t, i) => (
          <Reveal key={t.id} delay={(i % 3) * 0.06} className="mb-6 break-inside-avoid">
            <figure className="card-hover glass rounded-3xl p-6">
              <Quote className="size-6 text-brand/70" />
              <p className="mt-1 text-amber-300" aria-label={`${t.rating} out of 5 stars`}>{"★".repeat(t.rating)}<span className="text-white/15">{"★".repeat(5 - t.rating)}</span></p>
              <blockquote className="mt-3 leading-relaxed text-white/75">{t.quote}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar name={t.name} src={t.photoUrl} className="size-11 text-sm" />
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/50">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
