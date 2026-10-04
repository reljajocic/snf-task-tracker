"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/tasks";

/** "+ Assign video" on a free slot: filmed videos with type, who's on camera and a script preview. */
export function AssignPicker({ videos, onPick }: { videos: Task[]; onPick: (id: string) => void }) {
  const t = useTranslations("schedule");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string | null>(null);
  // Rows live in an overflow-hidden card, so the menu is fixed to the viewport, under the button.
  const [anchor, setAnchor] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const dismiss = (e: Event) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  const types = [...new Set(videos.map((v) => v.content_type).filter(Boolean))] as string[];
  const shown = type ? videos.filter((v) => v.content_type === type) : videos;
  const chip = (active: boolean) =>
    `h-7 cursor-pointer rounded-full border px-2.5 text-[12px] font-semibold tracking-[0.06em] ${active ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`;

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const up = window.innerHeight - r.bottom < 480 && r.top > window.innerHeight - r.bottom;
          setAnchor({ top: up ? r.top - 8 : r.bottom + 8, right: window.innerWidth - r.right, up });
          setOpen(!open);
        }}
        className="cursor-pointer whitespace-nowrap text-[13px] font-medium text-ink2 hover:text-ink"
      >
        {t("assign")}
      </button>
      {open && (
        <div
          style={anchor ? ({ "--top": `${anchor.top}px`, "--right": `${anchor.right}px` } as React.CSSProperties) : undefined}
          className={`fixed inset-x-4 bottom-4 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-lg border border-line2 bg-pop shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:inset-x-auto sm:bottom-auto sm:right-[var(--right)] sm:top-[var(--top)] sm:max-h-[460px] sm:w-[420px] ${anchor?.up ? "sm:-translate-y-full" : ""}`}
        >
          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5 border-b border-line px-3.5 py-3">
              <button type="button" onClick={() => setType(null)} className={chip(type === null)}>
                {t("pickAll")}
              </button>
              {types.map((x) => (
                <button key={x} type="button" onClick={() => setType(type === x ? null : x)} className={chip(type === x)}>
                  {x}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col overflow-y-auto">
            {shown.map((v) => {
              const first = v.script.find((s) => s.text.trim());
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPick(v.id);
                  }}
                  className="flex cursor-pointer flex-col gap-1.5 border-t border-line px-3.5 py-3 text-left first:border-t-0 hover:bg-chip"
                >
                  <span className="flex items-center gap-2">
                    {v.content_type && (
                      <span className="flex-none rounded-[3px] border border-line2 px-1.5 py-1 text-[10.5px] font-semibold leading-none tracking-[0.08em] text-ink2">
                        {v.content_type}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-[14.5px] font-medium leading-snug text-ink">{v.title}</span>
                  </span>
                  {(v.on_camera || v.location) && (
                    <span className="truncate text-[12.5px] text-ink3">{[v.on_camera, v.location].filter(Boolean).join(" · ")}</span>
                  )}
                  {first && (
                    <span className="line-clamp-2 text-[13px] leading-snug text-ink2">
                      {first.label && <span className="mr-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-accent">{first.label}</span>}
                      {first.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
