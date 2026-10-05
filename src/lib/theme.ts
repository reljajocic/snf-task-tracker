export type Theme = "dark" | "light" | "system";

export const THEME_COOKIE = "snf-theme";
export const THEMES: Theme[] = ["system", "light", "dark"];

/** Follows the device unless the user picked light or dark in Settings. */
export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Runs in <head> before paint: with "system" (no data-theme from the server), pick light/dark
 * from the device and keep following it while the theme is still "system".
 */
export const SYSTEM_THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: light)');function sys(){return !/(?:^|; )${THEME_COOKIE}=(light|dark)/.test(document.cookie)}function a(){if(sys())d.dataset.theme=m.matches?'light':'dark'}a();m.addEventListener('change',a);window.__snfApplySystemTheme=a})()`;

export const SIDEBAR_COOKIE = "snf-sidebar";
