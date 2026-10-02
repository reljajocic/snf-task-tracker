"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/auth";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { saveTheme } from "./actions";

/** Mobile header (design 1b): logo, theme pill, avatar with a small account menu. */
export function MobileTopBar({ profile, theme: initial }: { profile: Profile; theme: Theme }) {
  const t = useTranslations();
  const [theme, setTheme] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
    void saveTheme(next);
  };

  return (
    <header className="flex items-center justify-between px-5 pb-1 pt-[max(14px,env(safe-area-inset-top))] lg:hidden">
      <Link href="/">
        <img src="/brand/logo-off-white.png" alt="Slate 'n' Frame" className="h-[22px] [filter:var(--logo-filter)]" />
      </Link>
      <div ref={ref} className="relative flex items-center gap-2.5">
        <button type="button" onClick={toggleTheme} className="h-9 cursor-pointer whitespace-nowrap rounded-full border border-line2 px-3 text-[13px] font-medium text-ink2">
          {theme === "dark" ? t("theme.toLightShort") : t("theme.toDarkShort")}
        </button>
        <button type="button" aria-label={t("common.menu")} onClick={() => setOpen((o) => !o)} className="cursor-pointer rounded-full">
          <Avatar person={profile} size={36} />
        </button>
        {open && (
          <div className="absolute right-0 top-12 z-40 flex w-52 flex-col rounded-lg border border-line2 bg-surf p-1.5 shadow-[var(--shadow-overlay)]">
            <span className="truncate px-3 py-2 text-[13px] text-ink3">{profile.email}</span>
            {profile.role === "admin" && (
              <Link href="/team" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-[15px] hover:bg-chip">
                {t("nav.team")}
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button type="submit" className="w-full cursor-pointer rounded-md px-3 py-2.5 text-left text-[15px] text-red-ink hover:bg-chip">
                {t("common.signOut")}
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
