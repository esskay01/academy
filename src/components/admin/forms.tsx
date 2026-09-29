"use client";

import {
  createAdmin,
  promoteByEmail,
  saveAnnouncement,
  saveCoach,
  saveProgram,
  saveSettings,
  saveSlot,
  saveTestimonial,
  updateMember,
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { ImageInput } from "@/components/ui/image-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SKILL_LEVELS } from "@/lib/constants";
import type { Announcement, Coach, Program, SiteSettings, Testimonial, TrainingSlot, User } from "@/lib/db/schema";
import { capitalize } from "@/lib/utils";

type WithDone = { onDone?: () => void };
const levelOptions = SKILL_LEVELS.map((l) => ({ value: l, label: capitalize(l) }));

export function CoachForm({ coach, onDone }: { coach?: Coach } & WithDone) {
  const p = coach ? `coach-${coach.id}-` : "coach-new-";
  return (
    <AdminForm action={saveCoach} submitLabel={coach ? "Save coach" : "Add coach"} resetOnSuccess={!coach} onSuccess={onDone}>
      {(e) => (
        <>
          {coach && <input type="hidden" name="id" value={coach.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id={`${p}name`} label="Name" name="name" defaultValue={coach?.name} error={e.name} />
            <Input id={`${p}title`} label="Title" name="title" defaultValue={coach?.title} placeholder="Senior Coach — Juniors" error={e.title} />
          </div>
          <Textarea id={`${p}bio`} label="Bio" name="bio" defaultValue={coach?.bio} error={e.bio} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea id={`${p}spec`} label="Specialties" name="specialties" rows={3} defaultValue={coach?.specialties.join("\n")} hint="One per line" error={e.specialties} />
            <Textarea id={`${p}ach`} label="Achievements" name="achievements" rows={3} defaultValue={coach?.achievements ?? ""} error={e.achievements} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id={`${p}exp`} label="Experience (yrs)" name="experienceYears" type="number" min={0} defaultValue={coach?.experienceYears ?? 1} error={e.experienceYears} />
            <Input id={`${p}order`} label="Display order" name="sortOrder" type="number" min={0} defaultValue={coach?.sortOrder ?? 0} error={e.sortOrder} />
            <Input id={`${p}photo`} label="Photo URL" name="photoUrl" type="url" placeholder="https://…" defaultValue={coach?.photoUrl ?? ""} error={e.photoUrl} />
          </div>
          <Checkbox label="Show on website" name="isActive" defaultChecked={coach?.isActive ?? true} />
        </>
      )}
    </AdminForm>
  );
}

export function SlotForm({ slot, coaches, onDone }: { slot?: TrainingSlot; coaches: Pick<Coach, "id" | "name">[] } & WithDone) {
  const p = slot ? `slot-${slot.id}-` : "slot-new-";
  return (
    <AdminForm action={saveSlot} submitLabel={slot ? "Save slot" : "Add slot"} resetOnSuccess={!slot} onSuccess={onDone}>
      {(e) => (
        <>
          {slot && <input type="hidden" name="id" value={slot.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id={`${p}title`} label="Batch name" name="title" defaultValue={slot?.title} placeholder="Sunrise Juniors" error={e.title} />
            <Input id={`${p}days`} label="Days" name="days" defaultValue={slot?.days} placeholder="Mon · Wed · Fri" error={e.days} />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Input id={`${p}start`} label="Start" name="startTime" type="time" defaultValue={slot?.startTime ?? "06:00"} error={e.startTime} className="[color-scheme:dark]" />
            <Input id={`${p}end`} label="End" name="endTime" type="time" defaultValue={slot?.endTime ?? "07:30"} error={e.endTime} className="[color-scheme:dark]" />
            <Input id={`${p}cap`} label="Capacity" name="capacity" type="number" min={1} defaultValue={slot?.capacity ?? 16} error={e.capacity} />
            <Input id={`${p}enr`} label="Enrolled" name="enrolled" type="number" min={0} defaultValue={slot?.enrolled ?? 0} error={e.enrolled} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select id={`${p}level`} label="Level" name="level" defaultValue={slot?.level ?? "beginner"} options={levelOptions} error={e.level} />
            <Select
              id={`${p}coach`}
              label="Coach"
              name="coachId"
              defaultValue={slot?.coachId ? String(slot.coachId) : ""}
              options={[{ value: "", label: "— None —" }, ...coaches.map((c) => ({ value: String(c.id), label: c.name }))]}
              error={e.coachId}
            />
            <Input id={`${p}order`} label="Display order" name="sortOrder" type="number" min={0} defaultValue={slot?.sortOrder ?? 0} error={e.sortOrder} />
          </div>
          <Checkbox label="Open for bookings (show on website)" name="isActive" defaultChecked={slot?.isActive ?? true} />
        </>
      )}
    </AdminForm>
  );
}

export function ProgramForm({ program, onDone }: { program?: Program } & WithDone) {
  const p = program ? `prog-${program.id}-` : "prog-new-";
  return (
    <AdminForm action={saveProgram} submitLabel={program ? "Save program" : "Add program"} resetOnSuccess={!program} onSuccess={onDone}>
      {(e) => (
        <>
          {program && <input type="hidden" name="id" value={program.id} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id={`${p}name`} label="Name" name="name" defaultValue={program?.name} error={e.name} fieldClassName="sm:col-span-2" />
            <Input id={`${p}price`} label="Price / month (₹)" name="priceMonthly" type="number" min={0} defaultValue={program?.priceMonthly ?? 3000} error={e.priceMonthly} />
          </div>
          <Textarea id={`${p}desc`} label="Description" name="description" rows={2} defaultValue={program?.description} error={e.description} />
          <Textarea id={`${p}feat`} label="Features" name="features" rows={4} defaultValue={program?.features.join("\n")} hint="One per line" error={e.features} />
          <div className="flex flex-wrap items-end gap-6">
            <Input id={`${p}order`} label="Display order" name="sortOrder" type="number" min={0} defaultValue={program?.sortOrder ?? 0} error={e.sortOrder} fieldClassName="w-32" />
            <Checkbox label="Highlight as most popular" name="isFeatured" defaultChecked={program?.isFeatured ?? false} />
            <Checkbox label="Show on website" name="isActive" defaultChecked={program?.isActive ?? true} />
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function AnnouncementForm({ item, onDone }: { item?: Announcement } & WithDone) {
  const p = item ? `ann-${item.id}-` : "ann-new-";
  return (
    <AdminForm action={saveAnnouncement} submitLabel={item ? "Save" : "Publish"} resetOnSuccess={!item} onSuccess={onDone}>
      {(e) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id={`${p}title`} label="Title" name="title" defaultValue={item?.title} error={e.title} fieldClassName="sm:col-span-2" />
            <Input id={`${p}tag`} label="Tag" name="tag" defaultValue={item?.tag ?? ""} placeholder="Tournament" error={e.tag} />
          </div>
          <Textarea id={`${p}body`} label="Message" name="body" defaultValue={item?.body} error={e.body} />
          <Checkbox label="Published" name="isPublished" defaultChecked={item?.isPublished ?? true} />
        </>
      )}
    </AdminForm>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const s = settings;
  return (
    <AdminForm action={saveSettings} submitLabel="Save website info">
      {(e) => (
        <div className="space-y-8">
          <Group title="Brand & hero">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Academy name" name="academyName" defaultValue={s?.academyName} error={e.academyName} />
              <Input label="Tagline" name="tagline" defaultValue={s?.tagline} error={e.tagline} />
            </div>
            <Input label="Hero headline" name="heroTitle" defaultValue={s?.heroTitle} error={e.heroTitle} hint="The last two words get the gradient highlight." />
            <Textarea label="Hero sub-heading" name="heroSubtitle" defaultValue={s?.heroSubtitle} error={e.heroSubtitle} />
            <Textarea label="About the academy" name="aboutText" rows={4} defaultValue={s?.aboutText} error={e.aboutText} />
          </Group>
          <Group title="Contact information">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Phone" name="phone" defaultValue={s?.phone} error={e.phone} />
              <Input label="Email" name="email" type="email" defaultValue={s?.email} error={e.email} />
              <Input label="WhatsApp" name="whatsapp" defaultValue={s?.whatsapp ?? ""} error={e.whatsapp} />
            </div>
            <Input label="Address" name="address" defaultValue={s?.address} error={e.address} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Opening hours" name="openingHours" defaultValue={s?.openingHours} error={e.openingHours} />
              <Input label="Google Maps embed URL" name="mapEmbedUrl" type="url" defaultValue={s?.mapEmbedUrl ?? ""} error={e.mapEmbedUrl} hint="Maps → Share → Embed a map → copy the src URL" />
            </div>
          </Group>
          <Group title="Social links">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Instagram" name="instagramUrl" type="url" defaultValue={s?.instagramUrl ?? ""} error={e.instagramUrl} />
              <Input label="Facebook" name="facebookUrl" type="url" defaultValue={s?.facebookUrl ?? ""} error={e.facebookUrl} />
              <Input label="YouTube" name="youtubeUrl" type="url" defaultValue={s?.youtubeUrl ?? ""} error={e.youtubeUrl} />
            </div>
          </Group>
          <Group title="Headline numbers">
            <div className="grid gap-4 sm:grid-cols-4">
              <Input label="Courts" name="courtsCount" type="number" min={0} defaultValue={s?.courtsCount ?? 0} error={e.courtsCount} />
              <Input label="Students" name="studentsCount" type="number" min={0} defaultValue={s?.studentsCount ?? 0} error={e.studentsCount} />
              <Input label="Years running" name="yearsRunning" type="number" min={0} defaultValue={s?.yearsRunning ?? 0} error={e.yearsRunning} />
              <Input label="Titles won" name="titlesWon" type="number" min={0} defaultValue={s?.titlesWon ?? 0} error={e.titlesWon} />
            </div>
          </Group>
        </div>
      )}
    </AdminForm>
  );
}

export function CreateAdminForm() {
  return (
    <AdminForm action={createAdmin} submitLabel="Create admin" resetOnSuccess>
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="new-admin-name" label="Full name" name="name" error={e.name} />
            <Input id="new-admin-email" label="Email" name="email" type="email" error={e.email} />
            <PhoneInput id="new-admin-phone" error={e.phone} />
            <Input id="new-admin-password" label="Temporary password" name="password" type="password" autoComplete="new-password" error={e.password} />
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function PromoteForm() {
  return (
    <AdminForm action={promoteByEmail} submitLabel="Grant admin access" resetOnSuccess>
      {(e) => <Input id="promote-email" label="Existing member's email" name="email" type="email" placeholder="member@example.com" error={e.email} />}
    </AdminForm>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 text-sm font-semibold tracking-wider text-brand uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function MemberEditForm({ member }: { member: Pick<User, "id" | "name" | "email" | "phone" | "dateOfBirth" | "skillLevel" | "image"> }) {
  return (
    <AdminForm action={updateMember} submitLabel="Save member">
      {(e) => (
        <>
          <input type="hidden" name="userId" value={member.id} />
          <ImageInput id="member-photo" label="Student photo" currentUrl={member.image} fallbackName={member.name} error={e.photo} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" name="name" defaultValue={member.name} error={e.name} />
            <Input label="Email" name="email" type="email" defaultValue={member.email} error={e.email} />
            <PhoneInput defaultValue={member.phone} error={e.phone} />
            <Input label="Date of birth" name="dateOfBirth" type="date" defaultValue={member.dateOfBirth ?? ""} error={e.dateOfBirth} className="[color-scheme:dark]" />
            <Select label="Skill level" name="skillLevel" defaultValue={member.skillLevel} options={levelOptions} error={e.skillLevel} />
          </div>
        </>
      )}
    </AdminForm>
  );
}

export function TestimonialForm({ item, onDone }: { item?: Testimonial } & WithDone) {
  const p = item ? `tst-${item.id}-` : "tst-new-";
  return (
    <AdminForm action={saveTestimonial} submitLabel={item ? "Save testimonial" : "Add testimonial"} resetOnSuccess={!item} onSuccess={onDone}>
      {(e) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          <ImageInput id={`${p}photo`} currentUrl={item?.photoUrl} fallbackName={item?.name ?? "New"} error={e.photo} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id={`${p}name`} label="Name" name="name" defaultValue={item?.name} error={e.name} />
            <Input id={`${p}role`} label="Who they are" name="role" defaultValue={item?.role} placeholder="Parent of a U-13 player" error={e.role} />
          </div>
          <Textarea id={`${p}quote`} label="Testimonial" name="quote" rows={3} defaultValue={item?.quote} error={e.quote} />
          <div className="flex flex-wrap items-end gap-6">
            <Select
              id={`${p}rating`}
              label="Rating"
              name="rating"
              defaultValue={String(item?.rating ?? 5)}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }))}
              error={e.rating}
              fieldClassName="w-32"
            />
            <Input id={`${p}order`} label="Display order" name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} error={e.sortOrder} fieldClassName="w-32" />
            <Checkbox label="Published on website" name="isPublished" defaultChecked={item?.isPublished ?? true} />
          </div>
        </>
      )}
    </AdminForm>
  );
}
