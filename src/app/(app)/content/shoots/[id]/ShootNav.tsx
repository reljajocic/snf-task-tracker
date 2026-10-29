"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Step = { href: string; label: string } | null;

/**
 * Previous / next shoot day (this client's, or everyone's with "All clients"), also on ← and → —
 * except while typing or with a panel or dialog open.
 */
export function ShootNav({ prev, next, scope, labels }: { prev: Step; next: Step; scope: { href: string; all: boolean }; labels: { prev: string; next: string; all: string } }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      const step = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
      if (step) {
        e.preventDefault();
        router.push(step.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  const step = (s: Step, dir: "prev" | "next") =>
    s ? (
      <Link
        href={s.href}
        title={`${dir === "prev" ? labels.prev : labels.next} (${dir === "prev" ? "←" : "→"})`}
        className={`flex h-9 min-w-0 items-center gap-1.5 rounded-[7px] border border-line2 px-3 text-[13px] font-medium text-ink2 hover:text-ink ${dir === "next" ? "flex-row-reverse" : ""}`}
      >
        <span className="text-ink3">{dir === "prev" ? "‹" : "›"}</span>
        <span className="truncate">{s.label}</span>
      </Link>
    ) : (
      <span className="flex h-9 items-center px-3 text-[13px] text-ink3 opacity-50">{dir === "prev" ? "‹" : "›"}</span>
    );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {step(prev, "prev")}
      {step(next, "next")}
      <Link
        href={scope.href}
        aria-pressed={scope.all}
        className={`flex h-9 items-center rounded-full border px-3 text-[12px] font-medium ${scope.all ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink3 hover:text-ink"}`}
      >
        {labels.all}
      </Link>
    </div>
  );
}
