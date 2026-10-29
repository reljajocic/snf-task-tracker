"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

// Task details and the new-task form are overlays driven by the URL
// (?task=<id>, ?new=1), so they work on every screen and links are shareable.

export function useOverlayHref() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (set: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(set)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
}

export function TaskLink({
  id,
  children,
  ...props
}: { id: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  const href = useOverlayHref();
  return (
    <Link href={href({ task: id, new: null })} scroll={false} {...props}>
      {children}
    </Link>
  );
}

export function NewTaskButton() {
  const t = useTranslations("common");
  const href = useOverlayHref();
  return (
    <Link href={href({ new: "1", task: null })} scroll={false} className={buttonClass({ size: "sm" })}>
      {t("newTask")}
    </Link>
  );
}

/**
 * Mobile FAB: 64×64 rust circle, 20px from the right, just above the bottom bar (and the home indicator).
 * It steps aside while you scroll down (it used to cover the card behind it) and comes back on the way up.
 * Not on the content bank, whose own "+ New post" already knows the client and the tab.
 */
export function NewTaskFab() {
  const t = useTranslations("common");
  const href = useOverlayHref();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/content/videos")) return null;
  return (
    <Link
      href={href({ new: "1", task: null })}
      scroll={false}
      aria-label={t("newTask")}
      className={`fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-5 z-30 flex size-16 items-center justify-center rounded-full bg-accent text-[30px] font-light text-charcoal shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-[transform,opacity] duration-200 lg:hidden ${
        hidden ? "pointer-events-none translate-y-6 opacity-0" : ""
      }`}
    >
      +
    </Link>
  );
}
