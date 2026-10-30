"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useOverlayHref } from "@/components/tasks/links";
import { Segmented } from "@/components/ui/Segmented";
import Link from "next/link";

const VIEWS = [
  { href: "/kanban", key: "board" },
  { href: "/tasks", key: "list" },
  { href: "/calendar", key: "calendar" },
] as const;

/** "Tasks" is one place with three views of the same work (computers; phones get TaskPhoneBar). */
export function TaskViewTabs() {
  const t = useTranslations("taskViews");
  const pathname = usePathname();
  return (
    <nav className="hidden px-10 pt-7 lg:flex">
      <Segmented items={VIEWS.map((v) => ({ key: v.href, label: t(v.key), href: v.href, active: pathname.startsWith(v.href) }))} />
    </nav>
  );
}

/**
 * Phones: one row with the views (board and calendar; the list isn't used there), the screen's filters
 * and "+" for a new task, in place of a title, a row of tabs and the floating button.
 */
export function TaskPhoneBar({ filters }: { filters?: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const href = useOverlayHref();
  return (
    <div className="relative flex items-center gap-2 px-5 pb-1 pt-4 lg:hidden">
      <Segmented size="sm" items={VIEWS.filter((v) => v.key !== "list").map((v) => ({ key: v.href, label: t(`taskViews.${v.key}`), href: v.href, active: pathname.startsWith(v.href) }))} />
      {filters}
      <Link
        href={href({ new: "1", task: null })}
        scroll={false}
        aria-label={t("common.newTask")}
        className="ml-auto grid size-9 flex-none place-items-center rounded-full bg-accent text-[22px] font-light leading-none text-charcoal"
      >
        +
      </Link>
    </div>
  );
}
