// App languages. The choice lives on the profile (follows the user) and in a cookie (read on
// every request without a database round trip); it's set at sign-in and in Settings.
export const LOCALES = ["en", "sr"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "snf-locale";
export const LOCALE_NAME: Record<Locale, string> = { en: "English", sr: "Srpski" };

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : "en";
}

export const LOCALE_COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
