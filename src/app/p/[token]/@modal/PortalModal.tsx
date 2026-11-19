"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/** The window a video opens in: over the page, closed with ×, Esc or a click outside (back to where they were). */
export function PortalModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations("portal");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    addEventListener("keydown", onKey);
    // The page behind doesn't scroll while the window is open.
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      removeEventListener("keydown", onKey);
      html.style.overflow = was;
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[var(--overlay)] lg:p-6">
      <button type="button" aria-label={t("close")} onClick={() => router.back()} className="absolute inset-0 cursor-default" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="snf-in relative flex h-full w-full flex-col overflow-y-auto bg-bg outline-none lg:h-[calc(100dvh-48px)] lg:w-[min(1600px,calc(100vw-96px))] lg:rounded-lg lg:border lg:border-line2 lg:shadow-[var(--shadow-overlay)]"
      >
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => router.back()}
          className="fixed right-3 top-[calc(env(safe-area-inset-top)+10px)] z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-[var(--pop)] text-[24px] leading-none text-ink shadow-[var(--shadow-overlay)] lg:absolute lg:right-4 lg:top-4 lg:size-10"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
