import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { formatDate, weekdayIndex } from "@/lib/dates";
import { getSignup } from "@/lib/signup";
import { SignupList } from "./SignupList";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Talent sign-up for one shoot day: pick the videos you'll be in. No login (the link is the key).
export default async function SignupPage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  const signup = await getSignup(token);
  if (!signup) notFound();
  const locale = signup.locale;
  const [t, tw, messages] = await Promise.all([
    getTranslations({ locale, namespace: "signup" }),
    getTranslations({ locale, namespace: "weekday" }),
    getMessages({ locale }),
  ]);

  return (
    <div className="snf-canvas flex min-h-dvh flex-col text-ink">
      <header className="flex h-16 items-center gap-3.5 border-b border-line px-5 lg:h-[72px] lg:px-12">
        <img src="/brand/logo-off-white.png" alt="Slate 'n' Frame" className="h-5 [filter:var(--logo-filter)] lg:h-6" />
        <span className="text-[16px] text-ink3">×</span>
        <span className="truncate text-[15px] font-semibold">{signup.clientName}</span>
      </header>
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-5 pb-16 pt-8 lg:px-8 lg:pt-10">
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink3">
            {tw("long", { day: String(weekdayIndex(signup.date)) })}, {formatDate(signup.date)}
            {signup.location ? ` · ${signup.location}` : ""}
          </span>
          <h1 className="display text-[32px] lg:text-[44px]">{t("title")}</h1>
          <p className="max-w-[620px] text-[15px] leading-relaxed text-ink2">{t("lead")}</p>
        </div>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SignupList token={token} videos={signup.videos} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
