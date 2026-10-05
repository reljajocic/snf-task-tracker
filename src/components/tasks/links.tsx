"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
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

/** Mobile FAB: 64×64 rust circle, 20px from the right, just above the bottom bar (and the home indicator). */
export function NewTaskFab() {
  const t = useTranslations("common");
  const href = useOverlayHref();
  return (
    <Link
      href={href({ new: "1", task: null })}
      scroll={false}
      aria-label={t("newTask")}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-5 z-30 flex size-16 items-center justify-center rounded-full bg-accent text-[30px] font-light text-charcoal shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:hidden"
    >
      +
    </Link>
  );
}
