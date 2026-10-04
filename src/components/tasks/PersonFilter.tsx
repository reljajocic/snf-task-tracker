"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Person } from "@/lib/tasks";

/** "Everyone ▾" — pick one person's work; searchable, so it scales as the team grows. */
export function PersonFilter({ people, value, hrefFor }: { people: Person[]; value: string | null; hrefFor: Record<string, string> }) {
  const t = useTranslations("kanban");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = people.find((p) => p.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const shown = people.filter((p) => norm(p.full_name).includes(norm(q.trim())));
  const item = "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-[14px] font-medium hover:bg-chip";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setQ("");
        }}
        className={`flex h-[42px] cursor-pointer items-center gap-2.5 rounded-[7px] border px-3 text-[14px] font-medium ${current ? "border-ink2 text-ink" : "border-line2 text-ink2"}`}
      >
        {current && <Avatar person={current} size={24} />}
        <span className="max-w-[160px] truncate">{current?.full_name ?? t("everyone")}</span>
        <span className="text-ink3">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[50px] z-30 flex w-[280px] flex-col gap-1 rounded-lg border border-line2 bg-pop p-2 shadow-[var(--shadow-overlay)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPeople")}
            className="mb-1 h-10 rounded-md border border-line2 bg-transparent px-3 text-[14px] text-ink outline-none focus:border-accent"
          />
          <div className="flex max-h-[320px] flex-col overflow-y-auto">
            {!q && (
              <Link href={hrefFor.all} onClick={() => setOpen(false)} className={`${item} ${!value ? "text-ink" : "text-ink2"}`}>
                <span className="grid size-6 place-items-center rounded-full border border-line2 text-[11px]">∗</span>
                {t("everyone")}
              </Link>
            )}
            {shown.map((p) => (
              <Link key={p.id} href={hrefFor[p.id]} onClick={() => setOpen(false)} className={`${item} ${value === p.id ? "bg-chip text-ink" : "text-ink2"}`}>
                <Avatar person={p} size={24} />
                <span className="truncate">{p.full_name}</span>
              </Link>
            ))}
            {q && !shown.length && <span className="px-2.5 py-2 text-[13px] text-ink3">{t("noPeople")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
