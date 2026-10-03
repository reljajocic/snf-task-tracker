"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { formatDate } from "@/lib/dates";
import { setShotStatus } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { ShootDay } from "@/lib/content";
import { PHASES, type ShotStatus, type Task } from "@/lib/tasks";
import { addVideosToShoot, removeFromShoot } from "../actions";
import { CallTimes } from "./ShootTools";
import { ShootSheet } from "./ShootSheet";

type Slot = { time: string; onCamera: string; items: Task[] };

function groupSlots(videos: Task[]): Slot[] {
  const slots: Slot[] = [];
  let last = "—";
  for (const v of videos) {
    // Like the sheet: a row without a time belongs to the time above it.
    const time = v.shoot_time ?? last;
    last = time;
    let s = slots.find((x) => x.time === time);
    if (!s) slots.push((s = { time, onCamera: v.on_camera ?? "", items: [] }));
    s.items.push(v);
    if (!s.onCamera && v.on_camera) s.onCamera = v.on_camera;
  }
  return slots;
}

const isDone = (v: Task) => v.shot_status === "shot" || v.shot_status === "not_shot";

export function ShootBoard({
  day,
  videos,
  candidates,
  canManage,
  isToday,
  nowTime,
  desktopView,
  tags,
}: {
  desktopView: "sheet" | "onset";
  tags: string[];
  day: ShootDay;
  videos: Task[];
  candidates: Task[];
  canManage: boolean;
  isToday: boolean;
  nowTime: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, mark] = useOptimistic(videos, (cur, { id, status }: { id: string; status: ShotStatus }) =>
    cur.map((v) => (v.id === id ? { ...v, shot_status: status } : v)),
  );
  const [selected, setSelected] = useState<string | null>(videos[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const slots = groupSlots(items).map((s) => {
    const call = day.call_times.find((c) => c.time === s.time);
    return call ? { ...s, onCamera: call.name } : s;
  });
  const shotVideos = items.filter((v) => v.shot_status === "shot");
  const shot = items.filter((v) => v.shot_status === "shot").length;
  const pct = items.length ? (shot / items.length) * 100 : 0;
  const left = items.filter((v) => !isDone(v)).length;

  // "Now": on the day of the shoot, the latest slot that has started and still has work;
  // otherwise the first slot with anything left.
  const pending = slots.filter((s) => s.items.some((v) => !isDone(v)));
  const started = isToday ? pending.filter((s) => s.time !== "—" && s.time <= nowTime) : [];
  const nowSlot = started.at(-1) ?? pending[0] ?? null;

  const set = (id: string, status: ShotStatus) =>
    startTransition(async () => {
      mark({ id, status });
      await setShotStatus(id, status);
      router.refresh();
    });
  const toggle = (v: Task) => set(v.id, v.shot_status === "shot" ? "to_shoot" : "shot");

  const sel = items.find((v) => v.id === selected) ?? items[0] ?? null;

  const check = (v: Task, size = 26) => (
    <button
      type="button"
      aria-label={t("shoots.shot")}
      aria-pressed={v.shot_status === "shot"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(v);
      }}
      className="grid flex-none cursor-pointer place-items-center rounded-full border-[1.5px] text-[13px] font-bold text-ink-black"
      style={{
        width: size,
        height: size,
        borderColor: v.shot_status === "shot" ? "var(--status-in-progress)" : v.shot_status === "not_shot" ? "var(--prio-urgent)" : "var(--line2)",
        background: v.shot_status === "shot" ? "var(--status-in-progress)" : "transparent",
        color: v.shot_status === "not_shot" ? "var(--prio-urgent)" : undefined,
      }}
    >
      {v.shot_status === "shot" ? "✓" : v.shot_status === "not_shot" ? "×" : ""}
    </button>
  );

  const typeTag = (v: Task) =>
    v.content_type && (
      <span className="flex-none justify-self-start rounded-[3px] border border-line2 px-1.5 py-1 text-[11px] font-semibold leading-none tracking-[0.08em] text-ink2">
        {v.content_type}
      </span>
    );

  const scriptText = (v: Task) => v.script.map((s) => s.text).filter(Boolean).join(" ");

  const shotButtons = (v: Task) => (
    <div className="grid grid-cols-[1.4fr_1fr] gap-2">
      <button
        type="button"
        onClick={() => set(v.id, v.shot_status === "shot" ? "to_shoot" : "shot")}
        className={`h-14 cursor-pointer rounded-lg border text-[15px] font-semibold ${
          v.shot_status === "shot" ? "border-[var(--status-in-progress)] bg-[var(--status-in-progress)] text-ink-black" : "border-line2 text-ink"
        }`}
      >
        {t("shoots.shot")}
      </button>
      <button
        type="button"
        onClick={() => set(v.id, v.shot_status === "not_shot" ? "to_shoot" : "not_shot")}
        className={`h-14 cursor-pointer rounded-lg border text-[15px] font-medium ${
          v.shot_status === "not_shot" ? "border-[var(--prio-urgent)] bg-red-bg text-red-ink" : "border-line2 text-ink2"
        }`}
      >
        {t("shoots.notShot")}
      </button>
    </div>
  );

  const progress = (
    <div className="flex flex-1 items-center gap-3.5 lg:max-w-[520px]">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-chip lg:h-2">
        <div className="h-full rounded-full bg-[var(--status-in-progress)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-[14px] font-semibold">
        <span className="hidden lg:inline">{t("shoots.shotOf", { shot, total: items.length })}</span>
        <span className="lg:hidden">{t("shoots.left", { count: left })}</span>
      </span>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-line px-5 pb-5 lg:px-10">
        {progress}
        {day.starts_at && (
          <span className="hidden whitespace-nowrap text-[14px] font-medium text-ink2 lg:inline">
            {day.starts_at}
            {day.ends_at ? ` – ${day.ends_at}` : ""}
          </span>
        )}
        {day.crew.length > 0 && (
          <div className="hidden items-center gap-2.5 lg:flex">
            <span className="text-[14px] font-medium text-ink2">{t("shoots.crew")}</span>
            <AvatarStack people={day.crew} size={28} ring="var(--bg)" />
          </div>
        )}
        {canManage && (
          <span className="ml-auto flex items-center gap-4">
            {shotVideos.length > 0 && (
              <Link href={`/content/schedule?client=${day.client?.id ?? ""}&view=calendar`} className="text-[14px] font-medium text-ink">
                {t("shoots.scheduleShot", { count: shotVideos.length })}
              </Link>
            )}
            <button type="button" onClick={() => setAdding((a) => !a)} className="cursor-pointer text-[14px] font-medium text-rust-ink">
              {t("shoots.addVideos")}
            </button>
          </span>
        )}
      </div>

      {adding && (
        <AddVideos
          shootId={day.id}
          clientId={day.client?.id ?? ""}
          candidates={candidates}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}


      {/* Mobile: on set (2e) */}
      <div className="flex flex-col gap-[22px] px-5 pb-[120px] pt-5 lg:hidden">
        <CallTimes shootId={day.id} initial={day.call_times} canManage={canManage} />
        {nowSlot && (
          <div className="flex flex-col gap-3 rounded-xl border border-accent bg-surf p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-rust-bg px-2 py-[5px] text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-rust-ink">{t("shoots.now")}</span>
              <span className="display text-[22px] leading-none">{nowSlot.time}</span>
              <span className="text-[16px] font-medium">{nowSlot.onCamera}</span>
            </div>
            {nowSlot.items.map((v) => (
              <div key={v.id} className="flex flex-col gap-3 border-t border-line pt-3.5">
                <div className="flex items-start justify-between gap-2.5">
                  <TaskLink id={v.id} className="text-[18px] font-medium leading-snug">{v.title}</TaskLink>
                  {typeTag(v)}
                </div>
                {scriptText(v) && <span className="text-[15px] leading-normal text-ink2">{scriptText(v)}</span>}
                {v.note && <span className="text-[13px] font-medium text-[var(--status-waiting)]">{v.note}</span>}
                {v.reference_url && (
                  <a href={v.reference_url.startsWith("http") ? v.reference_url : `https://${v.reference_url}`} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-rust-ink">
                    {t("shoots.reference")}
                  </a>
                )}
                {shotButtons(v)}
              </div>
            ))}
          </div>
        )}
        {pending.filter((s) => s !== nowSlot).length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="display text-[16px]">{t("shoots.next")}</span>
            {pending
              .filter((s) => s !== nowSlot)
              .map((s) => (
                <div key={s.time} className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-surf px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="display text-[18px] leading-none">{s.time}</span>
                    <span className="text-[15px] font-medium">{s.onCamera}</span>
                    <span className="ml-auto text-[13px] font-medium text-ink3">{s.items.filter(isDone).length}/{s.items.length}</span>
                  </div>
                  {s.items.map((v) => (
                    <div key={v.id} className="flex min-h-11 items-center gap-3">
                      {check(v, 32)}
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-[15px] font-medium leading-snug">{v.title}</span>
                        {v.note && <span className="text-[13px] font-medium text-[var(--status-waiting)]">{v.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
        {slots.length - pending.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDone((s) => !s)}
              className="flex min-h-[52px] cursor-pointer items-center justify-between rounded-[10px] border border-line px-4 text-[15px] font-medium"
            >
              <span>{t("shoots.doneSlots", { count: slots.length - pending.length })}</span>
              <span className="text-ink3">{showDone ? "▲" : "▼"}</span>
            </button>
            {showDone &&
              slots
                .filter((s) => !pending.includes(s))
                .flatMap((s) => s.items)
                .map((v) => (
                  <div key={v.id} className="flex min-h-11 items-center gap-3 px-1">
                    {check(v, 32)}
                    <span className="text-[15px] text-ink2">{v.title}</span>
                  </div>
                ))}
          </div>
        )}
        {!items.length && <p className="text-[14px] text-ink3">{t("shoots.empty")}</p>}
      </div>

      {/* Desktop: the sheet (default) … */}
      {desktopView === "sheet" && (
        <div className="hidden lg:block">
          <div className="px-10 pt-5">
            <CallTimes shootId={day.id} initial={day.call_times} canManage={canManage} />
          </div>
          <ShootSheet shootId={day.id} clientId={day.client?.id ?? ""} videos={items} tags={tags} editable={canManage} />
        </div>
      )}

      {/* … or the on-set board (2d) */}
      <div className={`hidden min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] ${desktopView === "onset" ? "lg:grid" : ""}`}>
        <div className="flex flex-col overflow-auto pb-10 pl-10 pr-8 pt-5">
          <CallTimes shootId={day.id} initial={day.call_times} canManage={canManage} />
          {slots.map((s) => (
            <div key={s.time} className="flex flex-col gap-2 pt-5">
              <div className="flex items-center gap-3.5">
                <span className="display text-[22px] leading-none">{s.time}</span>
                <span className="whitespace-nowrap text-[15px] font-medium">{s.onCamera}</span>
                {s === nowSlot && isToday && (
                  <span className="rounded-full bg-rust-bg px-2 py-[5px] text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-rust-ink">{t("shoots.now")}</span>
                )}
                <span className="ml-auto text-[13px] font-medium text-ink3">
                  {s.items.filter(isDone).length}/{s.items.length}
                </span>
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surf">
                {s.items.map((v) => (
                  <div
                    key={v.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(v.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(v.id)}
                    className={`grid cursor-pointer grid-cols-[30px_minmax(0,1fr)_56px_100px] items-center gap-3.5 border-t border-line px-3.5 py-3 first:border-t-0 ${
                      sel?.id === v.id ? "bg-chip" : "hover:bg-chip"
                    }`}
                  >
                    {check(v)}
                    <div className="flex min-w-0 flex-col gap-[5px]">
                      <span className={`text-[15px] font-medium leading-snug ${v.shot_status === "not_shot" ? "text-ink3 line-through" : ""}`}>{v.title}</span>
                      {scriptText(v) && <span className="truncate text-[13px] text-ink3">{scriptText(v)}</span>}
                    </div>
                    {typeTag(v) || <span />}
                    <div className="flex flex-col items-start gap-1">
                      {v.reference_url && <span className="whitespace-nowrap text-[13px] font-medium text-rust-ink">{t("shoots.reference")}</span>}
                      {v.note && <span className="text-[12px] font-medium leading-tight text-[var(--status-waiting)]">{v.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!items.length && <p className="pt-6 text-[14px] text-ink3">{t("shoots.empty")}</p>}
        </div>

        <aside className="flex flex-col gap-5 overflow-auto border-l border-line px-7 pb-10 pt-6">
          {sel ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ink3">
                  {[sel.shoot_time, sel.on_camera, sel.location].filter(Boolean).join(" · ")}
                </span>
                <TaskLink id={sel.id} className="text-[22px] font-medium leading-tight hover:underline">{sel.title}</TaskLink>
              </div>
              {sel.script.some((sec) => sec.text.trim()) ? (
                <div className="flex flex-col gap-4">
                  {sel.script.filter((sec) => sec.text.trim()).map((sec, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent">{sec.label}</span>
                      <span className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">{sec.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[14px] text-ink3">{t("shoots.noScript")}</span>
              )}
              {sel.reference_url && (
                <a href={sel.reference_url.startsWith("http") ? sel.reference_url : `https://${sel.reference_url}`} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-rust-ink">
                  {t("shoots.reference")}
                </a>
              )}
              {sel.note && <span className="text-[14px] font-medium text-[var(--status-waiting)]">{sel.note}</span>}
              {shotButtons(sel)}
              {canManage && (
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await removeFromShoot(sel.id); router.refresh(); })}
                  className="cursor-pointer self-start text-[13px] text-ink3 hover:text-red-ink"
                >
                  {t("shoots.remove")}
                </button>
              )}
            </>
          ) : (
            <span className="text-[14px] text-ink3">{t("shoots.selectVideo")}</span>
          )}
        </aside>
      </div>
    </>
  );
}

function AddVideos({ shootId, clientId, candidates, onDone }: { shootId: string; clientId: string; candidates: Task[]; onDone: () => void }) {
  const t = useTranslations("shoots");
  const tp = useTranslations("phase");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const ids = Object.keys(picked);

  return (
    <div className="mx-5 mt-4 flex flex-col gap-3 rounded-lg border border-line2 bg-surf p-4 lg:mx-10">
      <div className="flex flex-col gap-1">
        <span className="display text-[15px]">{t("pickVideos")}</span>
        <span className="text-[13px] text-ink3">{t("pickHint")}</span>
      </div>
      {candidates.length ? (
        <div className="flex flex-col">
          {candidates.map((v) => {
            const on = v.id in picked;
            return (
              <label key={v.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line py-1.5 last:border-b-0">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPicked((cur) => {
                      const next = { ...cur };
                      if (on) delete next[v.id];
                      else next[v.id] = "";
                      return next;
                    })
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate text-[15px]">{v.title}</span>
                <span className="hidden text-[13px] text-ink3 sm:inline">
                  {[
                    tp(PHASES[Math.min(v.phase ?? 0, 4)]),
                    v.content_type,
                    v.on_camera,
                    v.shoot ? t("onOtherShoot", { date: formatDate(v.shoot.date) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {on && (
                  <input
                    type="time"
                    aria-label={t("time")}
                    value={picked[v.id]}
                    onChange={(e) => setPicked((cur) => ({ ...cur, [v.id]: e.target.value }))}
                    className="h-9 rounded-md border border-line2 bg-transparent px-2 text-[14px] text-ink"
                  />
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <span className="text-[14px] text-ink3">{t("noCandidates")}</span>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`?new=1&kind=video&client=${clientId}&shoot=${shootId}`} scroll={false} className="text-[14px] font-medium text-rust-ink">
          {t("newVideo")}
        </Link>
        <Button
          size="sm"
          disabled={!ids.length || pending}
          onClick={() =>
            startTransition(async () => {
              await addVideosToShoot(shootId, ids.map((id) => ({ id, time: picked[id] || null })));
              onDone();
            })
          }
        >
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
