export type Theme = "dark" | "light";

export const THEME_COOKIE = "snf-theme";

export function parseTheme(value: string | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

export const SIDEBAR_COOKIE = "snf-sidebar";
