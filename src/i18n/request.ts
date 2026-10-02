import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, TIME_ZONE } from "@/lib/config";

// Only English for now. Adding a language = a new messages/<locale>.json plus
// picking the locale here (from the user's profile or a cookie). No URL prefixes.

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
