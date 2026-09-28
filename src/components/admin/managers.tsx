"use client";

import { CalendarDays, Clock, Star, UserRound } from "lucide-react";
import {
  deleteAnnouncement,
  deleteCoach,
  deleteProgram,
  deleteSlot,
} from "@/app/admin/actions";
import { AnnouncementForm, CoachForm, ProgramForm, SlotForm } from "@/components/admin/forms";
import { AddPanel, EditableItem } from "@/components/admin/ui";
import type { Announcement, Coach, Program, TrainingSlot } from "@/lib/db/schema";
import { capitalize, formatDate, formatINR, formatTime, initials } from "@/lib/utils";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/45">{children}</p>;
}

function Hidden({ show }: { show: boolean }) {
  return show ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60 uppercase">Hidden</span> : null;
}

export function CoachManager({ coaches }: { coaches: Coach[] }) {
  return (
    <div className="space-y-3">
      <AddPanel label="Add a coach">{(done) => <CoachForm onDone={done} />}</AddPanel>
      {coaches.length === 0 && <Empty>No coaches yet.</Empty>}
      {coaches.map((c) => (
        <EditableItem key={c.id} muted={!c.isActive} renderForm={(done) => <CoachForm coach={c} onDone={done} />} deleteAction={() => deleteCoach(c.id)}>
          <div className="flex items-center gap-4">
            <span className="font-display grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand/80 to-cyan-400/80 font-bold text-ink">{initials(c.name)}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-white">
                {c.name} <Hidden show={!c.isActive} />
              </p>
              <p className="truncate text-sm text-white/50">
                {c.title} · {c.experienceYears} yrs · {c.specialties.join(", ")}
              </p>
            </div>
          </div>
        </EditableItem>
      ))}
    </div>
  );
}

export function SlotManager({ slots, coaches }: { slots: TrainingSlot[]; coaches: Pick<Coach, "id" | "name">[] }) {
  const coachName = new Map(coaches.map((c) => [c.id, c.name]));
  return (
    <div className="space-y-3">
      <AddPanel label="Add a training slot">{(done) => <SlotForm coaches={coaches} onDone={done} />}</AddPanel>
      {slots.length === 0 && <Empty>No slots yet.</Empty>}
      {slots.map((s) => {
        const left = s.capacity - s.enrolled;
        return (
          <EditableItem key={s.id} muted={!s.isActive} renderForm={(done) => <SlotForm slot={s} coaches={coaches} onDone={done} />} deleteAction={() => deleteSlot(s.id)}>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
              {s.title}
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/60">{capitalize(s.level)}</span>
              <Hidden show={!s.isActive} />
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{s.days}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
              {s.coachId && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />{coachName.get(s.coachId)}</span>}
              <span className={left <= 0 ? "text-rose-300" : left <= 3 ? "text-amber-200" : "text-brand"}>
                {s.enrolled}/{s.capacity} enrolled
              </span>
            </p>
          </EditableItem>
        );
      })}
    </div>
  );
}

export function ProgramManager({ programs }: { programs: Program[] }) {
  return (
    <div className="space-y-3">
      <AddPanel label="Add a program">{(done) => <ProgramForm onDone={done} />}</AddPanel>
      {programs.length === 0 && <Empty>No programs yet.</Empty>}
      {programs.map((p) => (
        <EditableItem key={p.id} muted={!p.isActive} renderForm={(done) => <ProgramForm program={p} onDone={done} />} deleteAction={() => deleteProgram(p.id)}>
          <p className="flex items-center gap-2 font-semibold text-white">
            {p.name}
            {p.isFeatured && <Star className="size-3.5 fill-brand text-brand" />}
            <Hidden show={!p.isActive} />
          </p>
          <p className="text-sm text-white/50">
            {formatINR(p.priceMonthly)}/month · {p.features.length} features
          </p>
        </EditableItem>
      ))}
    </div>
  );
}

export function AnnouncementManager({ items }: { items: Announcement[] }) {
  return (
    <div className="space-y-3">
      <AddPanel label="New announcement">{(done) => <AnnouncementForm onDone={done} />}</AddPanel>
      {items.length === 0 && <Empty>No announcements yet.</Empty>}
      {items.map((a) => (
        <EditableItem key={a.id} muted={!a.isPublished} renderForm={(done) => <AnnouncementForm item={a} onDone={done} />} deleteAction={() => deleteAnnouncement(a.id)}>
          <p className="flex items-center gap-2 font-semibold text-white">
            {a.title}
            {a.tag && <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[11px] text-orange-200">{a.tag}</span>}
            {!a.isPublished && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60 uppercase">Draft</span>}
          </p>
          <p className="truncate text-sm text-white/50">
            {formatDate(a.createdAt)} · {a.body}
          </p>
        </EditableItem>
      ))}
    </div>
  );
}
