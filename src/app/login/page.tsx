import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

// 6e / 6f: always the dark brand look, independent of the user's theme.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  const { error } = await searchParams;

  return (
    <div className="relative grid min-h-dvh bg-ink-black text-offwhite lg:grid-cols-[1.25fr_1fr]">
      {/* Brand panel (desktop) / backdrop (mobile) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden lg:pointer-events-auto lg:relative lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="absolute left-1/2 top-[150px] -ml-[260px] size-[520px] max-lg:[@media(max-height:760px)]:top-[40px] max-lg:[@media(max-height:760px)]:scale-75 bg-[radial-gradient(closest-side,rgba(234,105,58,0.28),rgba(234,105,58,0)_70%)] lg:left-auto lg:-right-[120px] lg:top-1/2 lg:-mt-[380px] lg:ml-0 lg:size-[760px] lg:bg-[radial-gradient(closest-side,rgba(234,105,58,0.30),rgba(234,105,58,0)_70%)]" />
        <img
          src="/brand/aperture-rust.png"
          alt=""
          className="absolute left-1/2 top-[190px] -ml-[120px] size-[240px] max-lg:[@media(max-height:760px)]:top-[110px] max-lg:[@media(max-height:760px)]:size-[180px] max-lg:[@media(max-height:760px)]:-ml-[90px] animate-[snf-spin-slow_60s_linear_infinite] object-contain lg:left-auto lg:right-10 lg:top-1/2 lg:-mt-[210px] lg:ml-0 lg:size-[420px]"
        />
        <div className="absolute inset-0 bg-[url(/brand/grain.png)] bg-[length:180px_180px] opacity-[0.09] mix-blend-overlay" />
        <img
          src="/brand/logo-off-white.png"
          alt="Slate 'n' Frame"
          className="relative hidden h-10 self-start lg:block"
        />
        <div className="relative hidden max-w-[420px] flex-col gap-4 lg:flex">
          <span className="display text-[56px]">{t("tagline")}</span>
          <span className="text-[17px] leading-[1.55] text-offwhite/70">{t("intro")}</span>
        </div>
      </div>

      {/* Form column */}
      <div className="relative flex min-h-dvh flex-col lg:items-center lg:justify-center lg:bg-charcoal lg:p-14">
        <div className="px-7 pt-[76px] lg:hidden">
          <img src="/brand/logo-off-white.png" alt="Slate 'n' Frame" className="h-[30px]" />
        </div>
        <div className="mt-auto w-full px-7 pb-11 lg:mt-0 lg:max-w-[400px] lg:p-0">
          <LoginForm initialError={error === "link" ? "linkExpired" : error === "inactive" ? "inactive" : null} />
        </div>
      </div>
    </div>
  );
}
