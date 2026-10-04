"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { inputClass } from "@/components/tasks/fields";
import { LOCALES, LOCALE_NAME } from "@/lib/locale";
import { addPortalPerson, rotateToken, setPortalFlag, setPortalLocale, updatePortalPerson, type PortalFlag } from "./actions";

type Portal = { enabled: boolean; show_schedule: boolean; show_shoots: boolean; show_scripts: boolean; show_review: boolean; show_report: boolean; locale: string };
type PortalPerson = { id: string; label: string; email: string | null; can_approve: boolean };

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-11 flex-none cursor-pointer rounded-full transition-colors ${on ? "bg-accent" : "bg-line2"}`}>
      <span className={`absolute top-[3px] size-[18px] rounded-full bg-offwhite transition-[left] ${on ? "left-[23px]" : "left-[3px]"}`} />
    </button>
  );
}

export function PortalSettings({
  clientId,
  url,
  portal,
  people,
  activity,
}: {
  clientId: string;
  url: string | null;
  portal: Portal;
  people: PortalPerson[];
  activity: { id: string; message: string; when: string }[];
}) {
  const t = useTranslations("portalSettings");
  const router = useRouter();
  const [state, setState] = useState(portal);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [approves, setApproves] = useState(true);

  const flip = (flag: PortalFlag) => {
    const value = !state[flag];
    setState((s) => ({ ...s, [flag]: value }));
    startTransition(async () => {
      await setPortalFlag(clientId, flag, value);
      router.refresh();
    });
  };

  const card = "flex flex-col gap-4 rounded-lg border border-line bg-surf p-[22px]";
  const h = (s: string) => <span className="display text-[18px] leading-tight">{s}</span>;
  const vis: [PortalFlag, string][] = [
    ["show_schedule", t("vis.schedule")],
    ["show_shoots", t("vis.shoots")],
    ["show_scripts", t("vis.scripts")],
    ["show_review", t("vis.review")],
    ["show_report", t("vis.report")],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 px-5 pb-[120px] lg:grid-cols-2 lg:px-10 lg:pb-12">
      <div className="flex flex-col gap-6">
        <section className={card}>
          <div className="flex items-center justify-between">
            {h(t("enabled"))}
            <Switch on={state.enabled} label={t("enabled")} onClick={() => flip("enabled")} />
          </div>
          <span className="text-[14px] leading-normal text-ink2">{t("enabledHint")}</span>
          {state.enabled && url ? (
            <>
              <div className="flex h-12 items-center gap-2 rounded-md border border-line2 pl-3.5 pr-1.5">
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink2">{url.replace(/^https?:\/\//, "")}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  className="h-9 cursor-pointer rounded-[5px] bg-seg px-3.5 text-[13px] font-medium text-seg-ink"
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => window.confirm(t("rotateConfirm")) && startTransition(async () => { await rotateToken(clientId); router.refresh(); })}
                className="cursor-pointer self-start text-[13px] font-medium text-red-ink"
              >
                {t("rotate")}
              </button>
            </>
          ) : (
            <span className="text-[13px] text-ink3">{t("disabledNote")}</span>
          )}
        </section>

        <section className={card}>
          {h(t("language"))}
          <span className="text-[14px] leading-normal text-ink2">{t("languageHint")}</span>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={state.locale === l}
                onClick={() => {
                  setState((s) => ({ ...s, locale: l }));
                  startTransition(async () => {
                    await setPortalLocale(clientId, l);
                    router.refresh();
                  });
                }}
                className={`h-10 cursor-pointer rounded-full border px-4 text-[14px] font-medium ${state.locale === l ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`}
              >
                {LOCALE_NAME[l]}
              </button>
            ))}
          </div>
        </section>

        <section className={`${card} gap-1.5`}>
          <div className="pb-2">{h(t("visibility"))}</div>
          {vis.map(([flag, label]) => (
            <div key={flag} className="flex min-h-12 items-center justify-between border-t border-line">
              <span className="text-[15px] font-medium">{label}</span>
              <Switch on={state[flag]} label={label} onClick={() => flip(flag)} />
            </div>
          ))}
          <div className="flex min-h-12 items-center justify-between border-t border-line">
            <span className="text-[15px] font-medium">{t("vis.internal")}</span>
            <span className="text-[13px] font-medium text-ink3">{t("alwaysHidden")}</span>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section className={`${card} gap-1.5`}>
          {h(t("people"))}
          <span className="pb-2.5 pt-1.5 text-[14px] text-ink2">{t("peopleHint")}</span>
          {people.map((p) => (
            <div key={p.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-line">
              <div className="flex min-w-0 flex-col gap-[5px]">
                <span className="text-[15px] font-medium leading-none">{p.label}</span>
                {p.email && <span className="truncate text-[13px] leading-none text-ink3">{p.email}</span>}
              </div>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await updatePortalPerson(clientId, p.id, { can_approve: !p.can_approve }); router.refresh(); })}
                  className={`cursor-pointer text-[13px] font-medium ${p.can_approve ? "text-ink2" : "text-ink3"}`}
                >
                  {p.can_approve ? t("approves") : t("viewOnly")}
                </button>
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => startTransition(async () => { await updatePortalPerson(clientId, p.id, { remove: true }); router.refresh(); })}
                  className="cursor-pointer text-[16px] text-ink3 hover:text-red-ink"
                >
                  ×
                </button>
              </span>
            </div>
          ))}
          <form
            className="flex flex-col gap-2 border-t border-line pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await addPortalPerson(clientId, { label, email, can_approve: approves });
                if (!res.error) {
                  setLabel("");
                  setEmail("");
                  router.refresh();
                }
              });
            }}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("personLabel")} className={inputClass} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t("personEmail")} className={inputClass} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
                <input type="checkbox" checked={approves} onChange={(e) => setApproves(e.target.checked)} className="accent-[var(--accent)]" />
                {t("approves")}
              </label>
              <button type="submit" disabled={!label.trim()} className="h-9 cursor-pointer rounded-md border border-line2 px-3.5 text-[13px] font-medium disabled:opacity-45">
                {t("addPerson")}
              </button>
            </div>
          </form>
        </section>

        <section className={`${card} gap-1.5`}>
          <div className="pb-2">{h(t("activity"))}</div>
          {activity.length ? (
            activity.map((a) => (
              <div key={a.id} className="flex min-h-11 items-center justify-between gap-3 border-t border-line text-[14px]">
                <span className="text-ink2">{a.message}</span>
                <span className="whitespace-nowrap text-[12px] text-ink3">{a.when}</span>
              </div>
            ))
          ) : (
            <span className="text-[14px] text-ink3">{t("noActivity")}</span>
          )}
        </section>
      </div>
    </div>
  );
}
