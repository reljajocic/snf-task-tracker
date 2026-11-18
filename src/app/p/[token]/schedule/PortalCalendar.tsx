"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { addDays, type IsoDate } from "@/lib/dates";
import { FORMAT_COLOR, type PostFormat } from "@/lib/formats";
import { PORTAL_STATUS_COLOR, type PortalStatus } from "@/lib/portal-status";
import { useApprover } from "../useApprover";
import { NameField } from "../video/[taskId]/VideoDecision";
import { setPostDate } from "../actions";

export type CalendarPost = {
  id: string;
  title: string;
  format: PostFormat;
  content_type: string | null;
  status: PortalStatus;
  publish_date: IsoDate | null;
  /** Filmed: it may also go back to "no date". */
  filmed: boolean;
};

/**
 * The client's month. When they plan dates (the team allows it), it works like the team's calendar on a computer:
 * drag a post onto another day, or one from "Filmed, no date" onto a day (and back). On phones the cells are too small
 * to drag; there a post opens and its date is changed with a button.
 */
export type CalendarMonth = { month: string; label: string; weeks: IsoDate[] };

export function PortalCalendar({ token, months, today, posts, pool, plans }: { token: string; months: CalendarMonth[]; today: IsoDate; posts: CalendarPost[]; pool: CalendarPost[]; plans: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useApprover();
  const [over, setOver] = useState<IsoDate | "pool" | null>(null);
  const [pending, setPending] = useState<{ id: string; date: IsoDate | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const all = [...posts, ...pool];
  const [items, move] = useOptimistic(all, (cur, { id, date }: { id: string; date: IsoDate | null }) => cur.map((v) => (v.id === id ? { ...v, publish_date: date } : v)));
  const canMove = (v: CalendarPost) => plans && v.status !== "published";

  const apply = (id: string, date: IsoDate | null, who: string) =>
    start(async () => {
      move({ id, date });
      const res = await setPostDate(token, id, date, who);
      setError(res.ok ? null : res.error);
      router.refresh();
    });

  const drop = (date: IsoDate | null) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/portal-post");
    const v = all.find((x) => x.id === id);
    if (!v || !canMove(v) || v.publish_date === date) return;
    if (date === null && !v.filmed) return setError(t("portal.notFilmed"));
    if (date && date < today) return setError(t("portal.pastDay"));
    if (!name.trim()) return setPending({ id, date });
    apply(id, date, name);
  };
  const target = (key: IsoDate | "pool", date: IsoDate | null) =>
    plans
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault();
            setOver(key);
          },
          onDragLeave: () => setOver((o) => (o === key ? null : o)),
          onDrop: drop(date),
        }
      : {};

  // "No date" is read, not just dragged: whole titles at reading size, one card each.
  const poolCard = (v: CalendarPost) => (
    <Link
      key={v.id}
      href={`/p/${token}/video/${v.id}`}
      draggable={canMove(v)}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/portal-post", v.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{ borderLeftColor: FORMAT_COLOR[v.format] }}
      className="flex cursor-grab flex-col gap-1.5 rounded-md border border-l-[3px] border-line bg-bg px-3.5 py-3 hover:border-ink3 active:cursor-grabbing"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: FORMAT_COLOR[v.format] }}>
        {t(`format.${v.format}`)}
        {v.content_type && <span className="font-medium normal-case tracking-normal text-ink3">· {v.content_type}</span>}
      </span>
      <span className="break-words text-[16px] font-medium leading-snug text-ink">{v.title}</span>
    </Link>
  );

  const chip = (v: CalendarPost) => (
    <Link
      key={v.id}
      href={`/p/${token}/video/${v.id}`}
      draggable={canMove(v)}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/portal-post", v.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      title={`${t(`format.${v.format}`)} · ${v.title}`}
      className={`hover:opacity-80 ${canMove(v) ? "lg:cursor-grab lg:active:cursor-grabbing" : ""}`}
    >
      {/* Phones: a cell is ~45px wide, so just the status dot ringed in the format's colour. Desktop: the format's
          colour down the left edge and its name above the title. */}
      <span
        style={{ borderLeftColor: FORMAT_COLOR[v.format] }}
        className={`flex items-center gap-1.5 text-[13px] font-medium leading-tight lg:flex-col lg:items-start lg:gap-0.5 lg:rounded-md lg:border-l-[3px] lg:bg-chip lg:px-1.5 lg:py-1`}
      >
        <span className="size-2 flex-none rounded-full lg:hidden" style={{ background: PORTAL_STATUS_COLOR[v.status], boxShadow: `0 0 0 1.5px var(--surf), 0 0 0 3px ${FORMAT_COLOR[v.format]}` }} />
        <span className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] lg:flex" style={{ color: FORMAT_COLOR[v.format] }}>
          <span className="size-1.5 rounded-full" style={{ background: PORTAL_STATUS_COLOR[v.status] }} />
          {t(`format.${v.format}`)}
        </span>
        <span className="hidden min-w-0 break-words lg:line-clamp-2">{v.title}</span>
      </span>
    </Link>
  );

  const shownPool = items.filter((v) => !v.publish_date);
  // The chosen month and the next, so posts can be planned ahead (and dragged across the turn of the month).
  const grid = (
    <div className="flex min-w-0 flex-col gap-8">
    {months.map(({ month, label, weeks }, k) => (
    <div key={month} className="flex min-w-0 flex-col gap-1.5">
      {(months.length > 1 || k > 0) && <h2 className="display pb-1 text-[18px] leading-none lg:text-[20px]">{label}</h2>}
      <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink3">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <span key={d} className="px-1.5">{t("weekday.short", { day: String(d) })}</span>
        ))}
      </div>
      {weeks.map((wk) => (
        <div key={wk} className="grid grid-cols-7 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = addDays(wk, i);
            const inMonth = d.slice(0, 7) === month;
            return (
              <div
                key={d}
                {...(d >= today ? target(d, d) : {})}
                className={`flex min-h-[56px] flex-col gap-1 rounded-lg border p-1.5 lg:min-h-[108px] lg:p-2 ${d === today ? "border-accent" : "border-line"} ${
                  over === d ? "bg-rust-bg" : inMonth ? "bg-surf" : ""
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span className={`text-[12px] font-semibold ${d === today ? "text-accent" : "text-ink3"}`}>{Number(d.slice(8))}</span>
                {items.filter((v) => v.publish_date === d).map((v) => chip(v))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
    ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {plans && <p className="hidden text-[14px] text-ink2 lg:block">{t("portal.dragHint")}</p>}
      {error && <p role="alert" className="text-[14px] text-red-ink">{error}</p>}
      {plans ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {grid}
          <aside {...target("pool", null)} className={`hidden flex-col gap-2.5 self-start rounded-lg border p-4 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-32px)] lg:overflow-auto ${over === "pool" ? "border-accent bg-rust-bg" : "border-line bg-surf"}`}>
            <span className="flex items-baseline gap-2">
              <span className="display text-[20px] leading-none">{t("portal.noDate")}</span>
              <span className="text-[15px] font-medium text-ink3">{shownPool.length}</span>
            </span>
            <span className="pb-1 text-[14px] leading-snug text-ink2">{t("portal.poolHint")}</span>
            {shownPool.map(poolCard)}
          </aside>
        </div>
      ) : (
        grid
      )}
      {pending && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-5" onClick={() => setPending(null)}>
          <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-lg border border-line bg-surf p-5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[15px] font-medium">{t("portal.nameToMove")}</span>
            <NameField name={name} setName={setName} />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => {
                  apply(pending.id, pending.date, name);
                  setPending(null);
                }}
                className="h-12 cursor-pointer rounded-md bg-accent px-[22px] text-[15px] font-semibold text-charcoal disabled:opacity-45"
              >
                {t("portal.saveDate")}
              </button>
              <button type="button" onClick={() => setPending(null)} className="h-12 cursor-pointer px-3 text-[15px] text-ink2">
                {t("portal.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
