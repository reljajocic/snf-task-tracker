"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SignupVideo } from "@/lib/signup";
import { useApprover } from "../../p/[token]/useApprover";
import { addName, removeName } from "./actions";

/** Each video a card: script by part, and "I'll do this one". Taken videos stay visible, greyed out. */
export function SignupList({ token, videos }: { token: string; videos: SignupVideo[] }) {
  const t = useTranslations("signup");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const me = name.trim().toLowerCase();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : res.error === "taken" ? t("justTaken") : t("failed"));
      router.refresh();
    });

  if (!videos.length) return <p className="text-[15px] text-ink3">{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-5">
      <label className="flex max-w-[420px] flex-col gap-2">
        <span className="text-[13px] font-medium text-ink3">{t("yourName")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="h-12 rounded-md border border-line2 bg-transparent px-3.5 text-[16px] text-ink outline-none focus:border-accent"
        />
        <span className="text-[12.5px] text-ink3">{t("nameHint")}</span>
      </label>
      {error && <span role="alert" className="text-[14px] text-red-ink">{error}</span>}

      <div className="flex flex-col gap-3">
        {videos.map((v) => {
          const mine = v.names.some((n) => n.toLowerCase() === me);
          const taken = v.names.length > 0 && !mine;
          const isOpen = open === v.id;
          const parts = isOpen ? v.script : v.script.slice(0, 1);
          return (
            <div
              key={v.id}
              className={`flex flex-col gap-3.5 rounded-xl border bg-surf p-4 transition-opacity lg:p-5 ${mine ? "border-accent" : "border-line"} ${taken ? "opacity-45 grayscale" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-[18px] font-medium leading-snug">{v.title}</span>
                {v.type && <span className="flex-none rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">{v.type}</span>}
              </div>

              {parts.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {parts.map((s, i) => (
                    <div key={i} className="flex flex-col gap-1.5 border-l-2 border-accent/60 pl-3">
                      {s.label && <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent">{s.label}</span>}
                      <span className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">{s.text}</span>
                    </div>
                  ))}
                  {v.script.length > 1 && (
                    <button type="button" onClick={() => setOpen(isOpen ? null : v.id)} className="cursor-pointer self-start text-[14px] font-medium text-rust-ink">
                      {isOpen ? t("less") : t("more")}
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
                <span className="text-[14px] font-medium text-ink2">
                  {mine ? t("yours") : taken ? t("takenBy", { name: v.names.join(", ") }) : t("free")}
                </span>
                <span className="ml-auto">
                  {mine ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => removeName(token, v.id, name))}
                      className="h-10 cursor-pointer rounded-md border border-line2 px-4 text-[14px] font-medium text-ink2"
                    >
                      {t("leave")}
                    </button>
                  ) : (
                    !taken && (
                      <button
                        type="button"
                        disabled={pending || !name.trim()}
                        onClick={() => run(() => addName(token, v.id, name))}
                        className="h-10 cursor-pointer rounded-md bg-accent px-4 text-[14px] font-semibold text-charcoal disabled:opacity-45"
                      >
                        {t("join")}
                      </button>
                    )
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
