"use client";

import { ScriptDecisionBadge } from "@/components/tasks/ScriptDecisionBadge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { formatDate } from "@/lib/dates";
import { setShotStatus } from "@/app/(app)/task-actions";
import { TaskLink } from "@/components/tasks/links";
import { AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { ShootDay } from "@/lib/content";
import { PHASES, type ShotStatus, type Task } from "@/lib/tasks";
import { updateTask } from "@/app/(app)/task-actions";
import { addVideosToShoot, removeFromShoot, reorderShoot, setSignupLink } from "../actions";
import { byShootOrder, byShootTime, deriveCallTimes, idsByTime } from "@/lib/script-text";
import { CallTimes } from "./ShootTools";
import { ShootSheet } from "./ShootSheet";
import { safeHref } from "@/lib/safe-url";
import { PostTags } from "@/components/tasks/tags";
import { FORMAT_COLOR, FORMATS, type PostFormat } from "@/lib/formats";

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

// Which post type the shoot day shows (all, or reels / posts / carousels only), kept in this browser.
const TYPE_KEY = "snf-shoot-post-type";
const subscribeType = (cb: () => void) => {
  window.addEventListener(TYPE_KEY, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TYPE_KEY, cb);
    window.removeEventListener("storage", cb);
  };
};
const readType = () => {
  try {
    return localStorage.getItem(TYPE_KEY) ?? "";
  } catch {
    return "";
  }
};

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
  const [unsorted, mark] = useOptimistic(videos, (cur, { id, status }: { id: string; status: ShotStatus }) =>
    cur.map((v) => (v.id === id ? { ...v, shot_status: status } : v)),
  );
  // All post types, or one only (like the portal's filter); remembered on this device.
  const onlyRaw = useSyncExternalStore(subscribeType, readType, () => "");
  const only = FORMATS.find((f) => f === onlyRaw) ?? null;
  const hiddenFormats = only ? FORMATS.filter((f) => f !== only) : [];
  const pickType = (f: PostFormat | null) => {
    try {
      localStorage.setItem(TYPE_KEY, f ?? "");
    } catch {}
    window.dispatchEvent(new Event(TYPE_KEY));
  };
  const all = [...unsorted].sort(byShootTime);
  const items = all.filter((v) => !hiddenFormats.includes(v.format));
  const formatsHere = FORMATS.filter((f) => all.some((v) => v.format === f));
  const [selected, setSelected] = useState<string | null>(videos[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // Phones: scripts open/closed per video, with "show all / hide all" on top. Videos up now start open.
  const [scriptMode, setScriptMode] = useState<"auto" | "all" | "none">("auto");
  const [scriptOverride, setScriptOverride] = useState<Record<string, boolean>>({});
  const scriptOpen = (id: string, byDefault: boolean) => scriptOverride[id] ?? (scriptMode === "all" ? true : scriptMode === "none" ? false : byDefault);
  const toggleScript = (id: string, byDefault: boolean) => setScriptOverride((cur) => ({ ...cur, [id]: !scriptOpen(id, byDefault) }));
  const setAllScripts = (mode: "all" | "none") => {
    setScriptMode(mode);
    setScriptOverride({});
  };
  const hasScript = (v: Task) => v.script.some((sec) => sec.text.trim());

  const slots = groupSlots(items).map((s) => {
    const names = [...new Set(s.items.map((v) => v.on_camera).filter(Boolean))].join(", ");
    return names ? { ...s, onCamera: names } : s;
  });
  // Progress counts the whole day, whatever is hidden.
  const shotVideos = all.filter((v) => v.shot_status === "shot");
  const shot = all.filter((v) => v.shot_status === "shot").length;
  const pct = all.length ? (shot / all.length) * 100 : 0;
  const left = all.filter((v) => !isDone(v)).length;

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

  // Format (video / photo / carousel) and content type, in their colours.
  const typeTag = (v: Task) => (
    <span className="flex-none justify-self-start">
      <PostTags format={v.format} type={v.content_type} formatLabel={t(`format.${v.format}`)} />
    </span>
  );

  const scriptText = (v: Task) => v.script.map((s) => s.text).filter(Boolean).join(" ");

  // Read on set: one block per part of the script (HOOK, OPEN LOOP 1, BODY, CTA…).
  const scriptBlock = (v: Task) => (
    <div className="flex flex-col gap-2.5">
      {v.script
        .filter((sec) => sec.text.trim())
        .map((sec, i) => (
          <div key={i} className="flex flex-col gap-1.5 border-l-2 border-accent/60 pl-3">
            {sec.label && <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent">{sec.label}</span>}
            <span className="whitespace-pre-wrap text-[16px] leading-relaxed text-ink">{sec.text}</span>
          </div>
        ))}
    </div>
  );
  const scriptToggle = (v: Task, byDefault: boolean) =>
    hasScript(v) && (
      <button
        type="button"
        aria-expanded={scriptOpen(v.id, byDefault)}
        onClick={(e) => {
          e.stopPropagation();
          toggleScript(v.id, byDefault);
        }}
        className="flex min-h-9 cursor-pointer items-center gap-1.5 self-start text-[14px] font-semibold text-rust-ink"
      >
        {t("shoots.script")} {scriptOpen(v.id, byDefault) ? "▴" : "▾"}
      </button>
    );

  const saveTime = (v: Task, value: string) => {
    if (value === (v.shoot_time ?? "")) return;
    startTransition(async () => {
      await updateTask(v.id, { shoot_time: value || null });
      // A time puts the video in its place in the running order.
      const next = [...unsorted].sort(byShootOrder).map((x) => (x.id === v.id ? { ...x, shoot_time: value || null } : x));
      await reorderShoot(day.id, idsByTime(next));
      router.refresh();
    });
  };

  // Who's on camera and when, on every video (gaps show up as "no time" / "nobody yet").
  const whoWhen = (v: Task, size: "sm" | "md" = "md") => {
    const icon = size === "sm" ? 13 : 15;
    return (
      <span className={`flex flex-wrap items-center gap-x-3.5 gap-y-1 font-medium leading-none ${size === "sm" ? "text-[13px]" : "text-[14px]"}`}>
        {canManage ? (
          // Editable right here (phones too): a native time picker on tap.
          <label className={`inline-flex items-center ${v.shoot_time ? "text-ink" : "text-ink3"}`} onClick={(e) => e.stopPropagation()}>
            {/* Saved when the picker closes, not on every segment (that re-sorted the list mid-edit). */}
            <input
              key={v.shoot_time ?? ""}
              type="time"
              step={300}
              defaultValue={v.shoot_time ?? ""}
              aria-label={t("shoots.time")}
              onBlur={(e) => saveTime(v, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className={`min-w-[4.5rem] cursor-pointer rounded-md border border-line2 bg-transparent px-1.5 py-1 font-medium text-inherit outline-none focus:border-accent ${size === "sm" ? "text-[13px]" : "text-[14px]"}`}
            />
          </label>
        ) : (
          <span className={`inline-flex items-center gap-1.5 ${v.shoot_time ? "text-ink" : "text-ink3"}`}>
            <ClockIcon size={icon} />
            {v.shoot_time ?? t("shoots.noTime")}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 ${v.on_camera ? "text-ink" : "text-[var(--waiting-ink)]"}`}>
          <PersonIcon size={icon} />
          {v.on_camera ?? t("shoots.noPerson")}
        </span>
      </span>
    );
  };

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
        <span className="hidden lg:inline">{t("shoots.shotOf", { shot, total: all.length })}</span>
        <span className="lg:hidden">{t("shoots.left", { count: left })}</span>
      </span>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-line px-5 pb-5 lg:px-10">
        {progress}
        {formatsHere.length > 1 && (
          <div className="inline-flex flex-wrap gap-0.5 rounded-[7px] border border-line2 p-[3px]">
            {[null, ...formatsHere].map((f) => (
              <button
                key={f ?? "all"}
                type="button"
                aria-pressed={only === f}
                onClick={() => pickType(f)}
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-3 text-[13px] font-medium ${only === f ? "bg-seg text-seg-ink" : "text-ink2 hover:text-ink"}`}
              >
                {f && <span className="size-2 rounded-full" style={{ background: FORMAT_COLOR[f] }} />}
                {f ? `${t(`format.${f}`)} · ${all.filter((v) => v.format === f).length}` : t("schedule.allFormats")}
              </button>
            ))}
          </div>
        )}
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
            <SignupLinkButton shootId={day.id} token={day.signup_token} />
            <button type="button" onClick={() => setAdding((a) => !a)} className="cursor-pointer text-[14px] font-medium text-rust-ink">
              {adding ? t("shoots.close") : t("shoots.addVideos")}
            </button>
          </span>
        )}
      </div>

      {adding && (
        <AddVideos
          shootId={day.id}
          clientId={day.client?.id ?? ""}
          candidates={candidates}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}


      {/* Mobile: on set (2e) */}
      <div className="flex flex-col gap-[22px] px-5 pb-[calc(120px+env(safe-area-inset-bottom))] pt-5 lg:hidden">
        <CallTimes times={deriveCallTimes(items)} />
        {items.some(hasScript) && (
          <div className="flex gap-2">
            {(["all", "none"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAllScripts(m)}
                className={`h-10 flex-1 cursor-pointer rounded-md border text-[14px] font-medium ${scriptMode === m ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"}`}
              >
                {t(m === "all" ? "shoots.showScripts" : "shoots.hideScripts")}
              </button>
            ))}
          </div>
        )}
        {nowSlot && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <span className="rounded-full bg-rust-bg px-2 py-[5px] text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-rust-ink">{t("shoots.now")}</span>
              <span className="display text-[24px] leading-none">{nowSlot.time}</span>
              <span className="text-[16px] font-medium">{nowSlot.onCamera}</span>
            </div>
            {/* One card per video; the one up next is outlined. */}
            {nowSlot.items.map((v, i) => (
              <div
                key={v.id}
                className={`flex flex-col gap-3 rounded-xl border bg-surf p-4 ${i === nowSlot.items.findIndex((x) => !isDone(x)) ? "border-accent" : "border-line"}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <TaskLink id={v.id} className="text-[18px] font-medium leading-snug">{v.title}</TaskLink>
                  {typeTag(v)}
                </div>
                {whoWhen(v)}
                <ScriptDecisionBadge decision={v.script_decision} full />
                {scriptToggle(v, true)}
                {hasScript(v) && scriptOpen(v.id, true) && scriptBlock(v)}
                {v.note && <span className="text-[14px] font-medium text-[var(--waiting-ink)]">{v.note}</span>}
                {v.reference_url && (
                  <a href={safeHref(v.reference_url)} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-rust-ink">
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
                <div key={s.time} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-1 pt-1">
                    <span className="display text-[18px] leading-none">{s.time}</span>
                    <span className="text-[15px] font-medium">{s.onCamera}</span>
                    <span className="ml-auto text-[13px] font-medium text-ink3">{s.items.filter(isDone).length}/{s.items.length}</span>
                  </div>
                  {s.items.map((v) => (
                    <div key={v.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surf px-4 py-3">
                      <div className="flex min-h-11 items-center gap-3">
                        {check(v, 32)}
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-[16px] font-medium leading-snug">{v.title}</span>
                          {whoWhen(v, "sm")}
                          <ScriptDecisionBadge decision={v.script_decision} />
                          {v.note && <span className="line-clamp-3 text-[14px] font-medium text-[var(--waiting-ink)]">{v.note}</span>}
                          {scriptToggle(v, false)}
                        </div>
                      </div>
                      {hasScript(v) && scriptOpen(v.id, false) && scriptBlock(v)}
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
                  <div key={v.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surf px-4 py-3">
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
            <CallTimes times={deriveCallTimes(items)} />
          </div>
          <ShootSheet
            shootId={day.id}
            clientId={day.client?.id ?? ""}
            videos={[...unsorted].filter((v) => !hiddenFormats.includes(v.format)).sort(byShootOrder)}
            allIds={hiddenFormats.length ? [...unsorted].sort(byShootOrder).map((v) => v.id) : undefined}
            tags={tags}
            editable={canManage}
          />
        </div>
      )}

      {/* … or the on-set board (2d) */}
      <div className={`hidden min-h-0 flex-1 grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px] ${desktopView === "onset" ? "lg:grid" : ""}`}>
        <div className="flex flex-col overflow-auto pb-10 pl-10 pr-8 pt-5">
          <CallTimes times={deriveCallTimes(items)} />
          {slots.map((s) => (
            <div key={s.time} className="flex flex-col gap-2 pt-5">
              <div className="flex items-center gap-3.5">
                <span className="display text-[24px] leading-none">{s.time}</span>
                <span className="whitespace-nowrap text-[15px] font-medium">{s.onCamera}</span>
                {s === nowSlot && isToday && (
                  <span className="rounded-full bg-rust-bg px-2 py-[5px] text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-rust-ink">{t("shoots.now")}</span>
                )}
                <span className="ml-auto text-[13px] font-medium text-ink3">
                  {s.items.filter(isDone).length}/{s.items.length}
                </span>
              </div>
              <div className="snf-stack">
                {s.items.map((v) => (
                  <div
                    key={v.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(v.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(v.id)}
                    className={`grid cursor-pointer grid-cols-[30px_minmax(0,1fr)_56px_76px] items-center gap-3.5 border-t border-line px-3.5 py-3 first:border-t-0 ${
                      sel?.id === v.id ? "bg-chip" : "hover:bg-hover"
                    }`}
                  >
                    {check(v)}
                    <div className="flex min-w-0 flex-col gap-[5px]">
                      <span className={`text-[15px] font-medium leading-snug ${v.shot_status === "not_shot" ? "text-ink3 line-through" : ""}`}>{v.title}</span>
                      {whoWhen(v, "sm")}
                      <ScriptDecisionBadge decision={v.script_decision} />
                      {scriptText(v) && <span className="truncate text-[13px] text-ink3">{scriptText(v)}</span>}
                      {/* Under the title, two lines at most; the whole note is in the panel on the right. */}
                      {v.note && <span className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--waiting-ink)]">{v.note}</span>}
                    </div>
                    {typeTag(v) || <span />}
                    <div className="flex flex-col items-start gap-1">
                      {v.reference_url && <span className="whitespace-nowrap text-[13px] font-medium text-rust-ink">{t("shoots.reference")}</span>}
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
                {sel.location && <span className="text-[13px] font-medium text-ink3">{sel.location}</span>}
                <TaskLink id={sel.id} className="text-[24px] font-medium leading-tight hover:underline">{sel.title}</TaskLink>
                {whoWhen(sel)}
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
                <a href={safeHref(sel.reference_url)} target="_blank" rel="noreferrer" className="text-[14px] font-medium text-rust-ink">
                  {t("shoots.reference")}
                </a>
              )}
              {sel.note && <span className="text-[14px] font-medium text-[var(--waiting-ink)]">{sel.note}</span>}
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

// Small line glyphs for the time / person line (same stroke style as the nav icons).
function ClockIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true" className="flex-none opacity-70">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.8V8l2.2 1.4" />
    </svg>
  );
}

function PersonIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true" className="flex-none opacity-70">
      <circle cx="8" cy="5.4" r="2.7" />
      <path d="M3 13.6c.6-2.5 2.6-3.9 5-3.9s4.4 1.4 5 3.9" />
    </svg>
  );
}

/** "Sign-up link": makes the talent link for this shoot (once) and copies it; × turns it off. */
function SignupLinkButton({ shootId, token }: { shootId: string; token: string | null }) {
  const t = useTranslations("shoots");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-1.5" title={t("signupHint")}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setSignupLink(shootId, true);
            if (!res.token) return;
            await navigator.clipboard?.writeText(`${window.location.origin}/s/${res.token}`).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (!token) router.refresh();
          })
        }
        className="cursor-pointer whitespace-nowrap text-[14px] font-medium text-ink"
      >
        {copied ? `✓ ${t("signupCopied")}` : t("signupLink")}
      </button>
      {token && (
        <button
          type="button"
          disabled={pending}
          aria-label={t("signupOff")}
          title={t("signupOff")}
          onClick={() =>
            start(async () => {
              await setSignupLink(shootId, false);
              router.refresh();
            })
          }
          className="grid size-6 cursor-pointer place-items-center rounded-full text-[15px] text-ink3 hover:text-red-ink"
        >
          ×
        </button>
      )}
    </span>
  );
}

function AddVideos({ shootId, clientId, candidates, onDone, onClose }: { shootId: string; clientId: string; candidates: Task[]; onDone: () => void; onClose: () => void }) {
  const t = useTranslations("shoots");
  const tf = useTranslations("format");
  const tp = useTranslations("phase");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const ids = Object.keys(picked);

  return (
    <div className="mx-5 mt-4 flex flex-col gap-3 rounded-lg border border-line2 bg-surf p-4 lg:mx-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="display text-[15px]">{t("pickVideos")}</span>
          <span className="text-[13px] text-ink3">{t("pickHint")}</span>
        </div>
        <button type="button" aria-label={t("close")} title={t("close")} onClick={onClose} className="size-8 flex-none cursor-pointer rounded-md text-[20px] text-ink2 hover:bg-hover hover:text-ink">
          ×
        </button>
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
                    tf(v.format),
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
