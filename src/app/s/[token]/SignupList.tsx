"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deriveCallTimes } from "@/lib/script-text";
import type { SignupVideo } from "@/lib/signup";
import { useApprover } from "../../p/[token]/useApprover";
import { addName, removeName } from "./actions";

const STATUS_COLOR = { to_shoot: "var(--line2)", shot: "var(--status-in-progress)", not_shot: "var(--prio-urgent)" } as const;

/**
 * Who comes when (as the team sees it), then each video in running order as a card: time, status,
 * script by part, and "I'll do this one". Taken videos stay visible, greyed out.
 */
export function SignupList({ token, videos }: { token: string; videos: SignupVideo[] }) {
  const t = useTranslations("signup");
  const ts = useTranslations("postingStatus");
  const router = useRouter();
  const [name, setName] = useApprover();
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const me = name.trim().toLowerCase();
  const isMine = (v: SignupVideo) => v.names.some((n) => n.toLowerCase() === me);
  const callTimes = deriveCallTimes(videos.map((v) => ({ shoot_time: v.time, on_camera: v.names.join(", ") || null })));
  const mineList = me ? videos.filter(isMine) : [];
  const myTimes = mineList.map((v) => v.time).filter((x): x is string => !!x).sort();

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

      {mineList.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-accent bg-surf px-4 py-3.5 lg:px-5">
          <span className="text-[16px] font-semibold">{myTimes[0] ? t("yourCall", { time: myTimes[0] }) : t("yourCallNoTime")}</span>
          <span className="text-[14px] text-ink2">{t("yourVideos", { count: mineList.length })}</span>
        </div>
      )}

      {callTimes.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surf px-4 py-4 lg:px-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink3">{t("callTimes")}</span>
          {callTimes.map((c) => (
            <div key={c.time} className="flex gap-4 text-[15px]">
              <span className="w-[52px] flex-none font-semibold tabular-nums">{c.time}</span>
              <span className="text-ink2">{c.name || t("nobodyYet")}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {videos.map((v, i) => {
          const mine = isMine(v);
          const taken = v.names.length > 0 && !mine;
          const isOpen = open === v.id;
          const parts = isOpen ? v.script : v.script.slice(0, 1);
          return (
            <div
              key={v.id}
              className={`flex flex-col gap-3.5 rounded-xl border bg-surf p-4 transition-opacity lg:p-5 ${mine ? "border-accent" : "border-line"} ${taken ? "opacity-45 grayscale" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-medium text-ink3">
                <span className="tabular-nums">#{i + 1}</span>
                {v.time && <span className="font-semibold tabular-nums text-ink">{v.time}</span>}
                <span className="ml-auto flex items-center gap-1.5 rounded-full border border-line2 px-2.5 py-1 text-[12.5px] text-ink2">
                  <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[v.status] }} />
                  {ts(v.status)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className={`text-[18px] font-medium leading-snug ${v.status === "not_shot" ? "text-ink3 line-through" : ""}`}>{v.title}</span>
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
