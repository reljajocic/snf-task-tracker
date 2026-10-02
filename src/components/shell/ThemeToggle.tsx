"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { saveTheme } from "./actions";

export function ThemeToggle({ initial }: { initial: Theme }) {
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
      className="h-10 w-full cursor-pointer rounded-md border border-line2 text-[13px] font-medium text-ink2 hover:text-ink"
    >
      {theme === "dark" ? t("toLight") : t("toDark")}
    </button>
  );
}
