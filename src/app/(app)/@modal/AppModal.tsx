"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * A form or detail opened from inside the app (new shoot day, edit client, an invoice…): a window over the page
 * instead of a new page. ×, Esc or a click outside goes back to where you were; the page's own link (or a refresh)
 * still opens it as a full page. Back links inside are hidden ([data-back-link]); the window is the way back.
 */
export function AppModal({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const box = useRef<HTMLDivElement>(null);
  // The slot keeps its last page while the app navigates elsewhere (after Save, a link inside): the window
  // belongs to the address it opened on, and closes once the address moves on.
  const pathname = usePathname();
  const [openedOn] = useState(pathname);
  const here = pathname === openedOn;

  useEffect(() => {
    if (!here) return;
    const onKey = (e: KeyboardEvent) => {
      // Esc in a field (a date picker, a select) belongs to the field first.
      if (e.key === "Escape" && !(e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [role=listbox]"))) router.back();
    };
    addEventListener("keydown", onKey);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    if (!box.current?.contains(document.activeElement)) box.current?.focus();
    return () => {
      removeEventListener("keydown", onKey);
      html.style.overflow = was;
    };
  }, [router, here]);

  if (!here) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[var(--overlay)] lg:p-6">
      <button type="button" aria-label={t("cancel")} onClick={() => router.back()} className="absolute inset-0 cursor-default" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-in-modal
        className={`snf-in relative flex h-full w-full flex-col overflow-y-auto bg-bg pt-[env(safe-area-inset-top)] outline-none lg:h-auto lg:max-h-[calc(100dvh-64px)] lg:py-4 lg:rounded-lg lg:border lg:border-line2 lg:pt-0 lg:shadow-[var(--shadow-overlay)] ${
          wide ? "lg:w-[min(1600px,calc(100vw-96px))]" : "lg:w-[min(1100px,calc(100vw-96px))]"
        }`}
      >
        <button
          type="button"
          aria-label={t("cancel")}
          onClick={() => router.back()}
          className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-10 grid size-10 cursor-pointer place-items-center rounded-full text-[24px] leading-none text-ink2 hover:bg-hover hover:text-ink lg:right-4 lg:top-4"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
