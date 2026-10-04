import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { TIME_ZONE } from "@/lib/config";
import { LOCALE_COOKIE, parseLocale } from "@/lib/locale";

// The language comes from a cookie set at sign-in and in Settings (no URL prefixes).
// The client portal is always English: its messages are English in every file.
export default getRequestConfig(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
