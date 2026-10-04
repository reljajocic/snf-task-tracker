import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { TIME_ZONE } from "@/lib/config";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

// The team's language comes from a cookie set at sign-in and in Settings (no URL prefixes).
// The client portal picks its own (per client) with setRequestLocale; that wins here.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = parseLocale(requested ?? (await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
