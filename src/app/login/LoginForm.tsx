"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendLoginLink, verifyLoginCode, type LoginResult } from "./actions";

type Step = "email" | "sent";

export function LoginForm({ linkExpired }: { linkExpired: boolean }) {
  const t = useTranslations("login");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(linkExpired ? t("linkExpired") : null);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  const handle = (result: LoginResult, onOk: () => void) => {
    if (result.ok) onOk();
    else setError(t(result.error));
  };

  const send = (again = false) =>
    startTransition(async () => {
      setError(null);
      handle(await sendLoginLink(email), () => {
        setStep("sent");
        setResent(again);
      });
    });

  const verify = () =>
    startTransition(async () => {
      setError(null);
      handle(await verifyLoginCode(email, code), () => {});
    });

  const errorLine = error && (
    <p role="alert" className="text-[14px] leading-normal text-[#F58A78]">
      {error}
    </p>
  );

  if (step === "email") {
    return (
      <form
        className="flex flex-col gap-[22px] lg:gap-7"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex flex-col gap-2.5 lg:gap-3">
          <h1 className="display text-[34px] lg:text-[40px]">{t("title")}</h1>
          <p className="text-[15px] leading-normal text-offwhite/70 lg:text-[16px]">
            <span className="lg:hidden">{t("leadMobile")}</span>
            <span className="hidden lg:inline">{t("lead")}</span>
          </p>
        </div>

        <label className="flex flex-col gap-2.5">
          <span className="eyebrow hidden lg:block" style={{ color: "rgba(244,243,237,.48)" }}>
            {t("emailLabel")}
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            aria-label={t("emailLabel")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-lg border border-offwhite/36 bg-offwhite/6 px-4 text-[17px] text-offwhite outline-none focus:border-accent lg:h-[52px] lg:rounded-none lg:border-0 lg:border-b lg:border-accent lg:bg-transparent lg:px-0 lg:text-[18px] lg:focus-visible:shadow-none"
          />
        </label>

        {errorLine}

        <Button type="submit" size="lg" disabled={pending} className="h-14 w-full font-semibold lg:h-[52px] lg:w-auto lg:self-start lg:font-medium">
          {pending ? t("sending") : (
            <>
              <span className="lg:hidden">{t("sendShort")}</span>
              <span className="hidden lg:inline">{t("send")}</span>
            </>
          )}
        </Button>

        <p className="hidden text-[13px] leading-normal text-offwhite/48 lg:block">{t("restricted")}</p>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-[22px] lg:gap-7">
      <div className="flex flex-col gap-2.5 lg:gap-3">
        <h1 className="display text-[34px] lg:text-[40px]">{t("checkTitle")}</h1>
        <p className="text-[15px] leading-[1.55] text-offwhite/70 lg:text-[16px]">
          <span className="lg:hidden">{t("checkLeadMobile", { email })}</span>
          <span className="hidden lg:inline">
            {t.rich("checkLead", { email, b: (chunks) => <span className="text-offwhite">{chunks}</span> })}
          </span>
        </p>
      </div>

      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <span className="eyebrow" style={{ color: "rgba(244,243,237,.48)" }}>
          {t("codeLabel")}
        </span>
        <div className="flex gap-2">
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label={t("codeLabel")}
            className="h-12 w-40 rounded-lg border border-offwhite/36 bg-offwhite/6 px-4 text-[18px] tracking-[0.3em] text-offwhite outline-none focus:border-accent"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending || code.length < 6} className="h-12 text-offwhite">
            {t("codeSubmit")}
          </Button>
        </div>
      </form>

      {errorLine}

      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        <button
          type="button"
          onClick={() => send(true)}
          disabled={pending}
          className="hidden h-11 cursor-pointer rounded-md border border-offwhite/36 px-4 text-[14px] font-medium text-offwhite disabled:opacity-45 lg:block"
        >
          {resent ? t("resent") : t("resend")}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="h-14 cursor-pointer rounded-lg border border-offwhite/36 text-[15px] font-medium text-offwhite lg:h-11 lg:border-0 lg:px-2 lg:text-[14px] lg:text-offwhite/70"
        >
          {t("changeEmail")}
        </button>
      </div>
    </div>
  );
}
