"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalNav({ tabs, variant }: { tabs: { href: string; label: string; exact?: boolean }[]; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const active = (t: { href: string; exact?: boolean }) => (t.exact ? pathname === t.href : pathname.startsWith(t.href));

  if (variant === "top") {
    return (
      <nav className="hidden h-full gap-1 lg:flex">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center px-3.5 text-[15px] font-medium ${active(t) ? "text-ink shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink2 hover:text-ink"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[84px] border-t border-line bg-side pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={`flex flex-1 flex-col items-center justify-center gap-2 text-[12px] font-medium ${active(t) ? "text-ink" : "text-ink3"}`}>
          <span className={`h-[3px] w-[18px] rounded-[2px] ${active(t) ? "bg-accent" : "bg-transparent"}`} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
