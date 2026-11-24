"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateTask, type TaskPatch } from "@/app/(app)/task-actions";
import type { IsoDate } from "@/lib/dates";
import { ITEM_STATUS_COLOR, PHASES, PUBLISHED_PHASE, STATUSES, canReturnToIdeas, itemStatus, type ItemStatus, type Task } from "@/lib/tasks";
import { useItemStatusLabel } from "./item-bits";

type Option = { key: ItemStatus; patch: TaskPatch; optimistic: Partial<Task> };

/** What a task or video can be moved to from its status button. */
function options(task: Task, today: IsoDate): Option[] {
  if (task.kind !== "video") return STATUSES.map((s) => ({ key: s, patch: { status: s }, optimistic: { status: s } }));
  // A dropped video comes back at the phase picked; the database sets its status from the phase.
  const back = task.dropped_at ? { dropped_at: null } : {};
  const phases: Option[] = [...PHASES, "published" as const].map((p, i) => ({
    key: p,
    patch: { ...back, phase: i },
    optimistic: { ...back, phase: i, status: i >= PUBLISHED_PHASE ? "done" : i === 3 ? "waiting_client" : "in_progress" },
  }));
  return task.dropped_at ? phases : [...phases, { key: "dropped", patch: { dropped_at: today }, optimistic: { dropped_at: today, status: "done" } }];
}

/**
 * The status, as a button that changes it: the same in the task window and in lists. Videos move between phases
 * (and can be dropped or sent back to ideas); tasks between their four statuses.
 * Without `save` it saves on its own (lists); the window passes its own `save` so the panel updates with it.
 */
export function StatusMenu({
  task,
  today,
  save,
  onReshoot,
  disabled = false,
  size = "md",
}: {
  task: Task;
  today: IsoDate;
  save?: (patch: TaskPatch, optimistic: Partial<Task>) => void;
  /** "Back to ideas to reshoot" (asks why): only where the window can show that form. */
  onReshoot?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const t = useTranslations("item");
  const label = useItemStatusLabel();
  // A pick shows at once; it holds until the saved item comes back from the server (then that shows).
  const version = `${task.status}|${task.phase}|${task.dropped_at}`;
  const [picked, setPicked] = useState<{ version: string; patch: Partial<Task> } | null>(null);
  const shown = picked?.version === version ? picked.patch : {};
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const current = { ...task, ...shown };
  const s = itemStatus(current);

  useEffect(() => {
    if (!open) return;
    const inside = (n: EventTarget | null) => n instanceof Node && (button.current?.contains(n) || panel.current?.contains(n));
    const close = (e: Event) => !inside(e.target) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc, true);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    (panel.current?.querySelector<HTMLElement>("[aria-checked=true]") ?? panel.current?.querySelector<HTMLElement>("[role^=menuitem]"))?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc, true);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Lists put this button inside a row that opens the item: the click is the button's alone.
    e.preventDefault();
    e.stopPropagation();
    if (open) return setOpen(false);
    const r = button.current!.getBoundingClientRect();
    const width = 240;
    const up = window.innerHeight - r.bottom < 360 && r.top > window.innerHeight - r.bottom;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8), up });
    setOpen(true);
  };

  const pick = (o: Option) => {
    close();
    if (o.key === s) return;
    setFailed(false);
    if (save) return save(o.patch, o.optimistic);
    setPicked({ version, patch: o.optimistic });
    startTransition(async () => {
      const res = await updateTask(task.id, o.patch);
      if (!res.ok) {
        setPicked(null);
        setFailed(true);
      }
    });
  };

  const item = "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3 text-left text-[14px] font-medium text-ink hover:bg-hover focus-visible:bg-hover sm:min-h-9";
  // Phones: 44px to tap (it's the one thing in a row that doesn't open the item).
  const sz = size === "sm" ? "h-8 px-2.5 text-[13px] max-lg:h-11 max-lg:px-3" : "h-9 px-3 text-[14px] max-lg:h-11";

  return (
    <>
      <button
        ref={button}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("status")}: ${label(s)}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) toggle(e);
        }}
        className={`inline-flex max-w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-line2 font-medium text-ink hover:border-ink3 disabled:cursor-default disabled:hover:border-line2 ${sz}`}
      >
        <span className="size-2 flex-none rounded-full" style={{ background: ITEM_STATUS_COLOR[s] }} />
        <span className="truncate">{label(s)}</span>
        {!disabled && <span aria-hidden className="text-[11px] text-ink3">▾</span>}
      </button>
      {failed && (
        <span role="alert" className="ml-2 text-[12px] font-medium text-red-ink">
          {t("notSaved")}
        </span>
      )}
      {open &&
        pos &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            onKeyDown={(e) => {
              // A menu is one stop: Tab leaves it (back on the button), arrows, Home and End move inside.
              if (e.key === "Tab") {
                e.preventDefault();
                return close();
              }
              const items = [...(panel.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              const to = { ArrowDown: (i + 1) % items.length, ArrowUp: (i + items.length - 1) % items.length, Home: 0, End: items.length - 1 }[e.key];
              if (to === undefined) return;
              e.preventDefault();
              items[to]?.focus();
            }}
            className={`fixed z-[60] flex w-[240px] flex-col gap-0.5 rounded-lg border border-line2 bg-pop p-1.5 shadow-[var(--shadow-overlay)] ${pos.up ? "-translate-y-full" : ""}`}
          >
            {options(current, today).map((o) => (
              <button
                key={o.key}
                type="button"
                role="menuitemradio"
                tabIndex={-1}
                aria-checked={o.key === s}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(o);
                }}
                className={`${item} ${o.key === "dropped" ? "mt-1 border-t border-line pt-1 text-ink2" : ""}`}
              >
                <span className="size-2 flex-none rounded-full" style={{ background: ITEM_STATUS_COLOR[o.key] }} />
                <span className="flex-1">{o.key === "dropped" ? t("drop") : label(o.key)}</span>
                {o.key === s && <span aria-hidden className="text-ink2">✓</span>}
              </button>
            ))}
            {onReshoot && canReturnToIdeas(current) && (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  onReshoot();
                }}
                className={`${item} text-rust-ink`}
              >
                <span aria-hidden className="w-2 text-center">↺</span>
                {t("reshoot")}
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
