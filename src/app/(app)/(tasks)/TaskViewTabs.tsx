"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Segmented } from "@/components/ui/Segmented";

const VIEWS = [
  { href: "/kanban", key: "board" },
  { href: "/tasks", key: "list" },
  { href: "/calendar", key: "calendar" },
] as const;

/** "Tasks" is one place with three views of the same work. */
export function TaskViewTabs() {
  const t = useTranslations("taskViews");
  const pathname = usePathname();
  return (
    <nav className="flex px-5 pt-4 lg:px-10 lg:pt-7">
      <Segmented items={VIEWS.map((v) => ({ key: v.href, label: t(v.key), href: v.href, active: pathname.startsWith(v.href) }))} />
    </nav>
  );
}
