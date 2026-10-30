import type { Metadata, Viewport } from "next";
import { DM_Sans, Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SYSTEM_THEME_SCRIPT, THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

// Display face: free stand-in for Uni Neue Black (brand font, not licensed for web yet).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["900"],
  subsets: ["latin", "latin-ext"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // One name on every page (owner's choice), no per-page titles.
  title: "SNF Dailies",
  description: "Internal task tracker for the Slate n' Frame team.",
  // The installed app starts below the status bar (no viewport-fit=cover): iOS 26 blurs a band under the
  // clock in home-screen apps, and drawn under it the logo and avatar came out blurred.
  appleWebApp: { capable: true, title: "SNF Dailies", statusBarStyle: "default" },
};

const CANVAS = { dark: "#121011", light: "#ece9e1" };

/** The status bar takes the canvas colour of the theme in use (the device's, when it's "system"). */
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: CANVAS.light },
            { media: "(prefers-color-scheme: dark)", color: CANVAS.dark },
          ]
        : CANVAS[theme],
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      className={`${montserrat.variable} ${dmSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* "system": set the theme from the device before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
      </head>
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body> before hydration. */}
      <body className="min-h-full" suppressHydrationWarning>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
