"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { saveTheme } from "./actions";
import { NAV_ICONS } from "./icons";

export function ThemeToggle({ initial, compact = false }: { initial: Theme; compact?: boolean }) {
  const t = useTranslations("theme");
  const [theme, setTheme] = useState<Theme>(initial);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
    void saveTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={compact ? (theme === "dark" ? t("toLight") : t("toDark")) : undefined}
      aria-label={theme === "dark" ? t("toLight") : t("toDark")}
      className="flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-line2 text-[13px] font-medium text-ink2 hover:text-ink"
    >
      {compact ? (theme === "dark" ? NAV_ICONS.sun : NAV_ICONS.moon) : theme === "dark" ? t("toLight") : t("toDark")}
    </button>
  );
}
