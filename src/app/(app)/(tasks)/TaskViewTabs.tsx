"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
      <div className="inline-flex gap-0.5 rounded-[7px] border border-line2 p-[3px]">
        {VIEWS.map((v) => {
          const active = pathname.startsWith(v.href);
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center rounded-[5px] px-4 text-[14px] font-medium ${active ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
            >
              {t(v.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
