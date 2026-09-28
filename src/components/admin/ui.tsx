"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionButton } from "@/components/admin/action-button";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type EditableProps = {
  children: ReactNode;
  /** Rendered when "Edit" is toggled. Receives `onDone` to collapse after save. */
  renderForm: (onDone: () => void) => ReactElement;
  deleteAction?: () => Promise<ActionState>;
  muted?: boolean;
};

/** A content row (coach, slot, …) that expands into its edit form in place. */
export function EditableItem({ children, renderForm, deleteAction, muted }: EditableProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("glass rounded-2xl transition", open && "border-brand/30", muted && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10"
          >
            {open ? <ChevronDown className="size-3.5 rotate-180" /> : <Pencil className="size-3.5" />}
            {open ? "Close" : "Edit"}
          </button>
          {deleteAction && (
            <ActionButton action={deleteAction} variant="ghost" confirm="Click to confirm">
              Delete
            </ActionButton>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-white/10 p-4 sm:p-5">{renderForm(() => setOpen(false))}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Collapsible "Add new …" panel. */
export function AddPanel({ label, children }: { label: string; children: (onDone: () => void) => ReactElement }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border border-dashed transition", open ? "border-brand/40 bg-brand/[0.03]" : "border-white/15")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-sm font-semibold text-brand"
        aria-expanded={open}
      >
        <Plus className={cn("size-4 transition", open && "rotate-45")} /> {label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5">{children(() => setOpen(false))}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
