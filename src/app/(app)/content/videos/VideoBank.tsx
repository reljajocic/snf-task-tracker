"use client";

import { ScriptDecisionBadge } from "@/components/tasks/ScriptDecisionBadge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { addVideosToShoot, removeFromShoot } from "@/app/(app)/content/shoots/actions";
import { updateTask } from "@/app/(app)/task-actions";
import { DatePicker } from "@/components/tasks/DatePicker";
import { TaskLink } from "@/components/tasks/links";
import { formatDate, type IsoDate } from "@/lib/dates";
import type { Task } from "@/lib/tasks";

type Shoot = { id: string; date: IsoDate; location: string | null };

/** One shelf of the video bank, with the move that takes a video to the next step. */
export function VideoBank({ tab, videos, shoots, today }: { tab: "ideas" | "shoot" | "ready" | "dropped"; videos: Task[]; shoots: Shoot[]; today: IsoDate }) {
  const t = useTranslations("bank");
  const router = useRouter();
  const [type, setType] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    startTransition(async () => {
      await fn();
      setBusy(null);
      router.refresh();
    });
  };

  const types = [...new Set(videos.map((v) => v.content_type).filter(Boolean))] as string[];
  const locations = [...new Set(videos.map((v) => v.location).filter(Boolean))] as string[];
  const profiles = [...new Set(videos.map((v) => v.profile).filter(Boolean))] as string[];
  const shown = videos.filter(
    (v) => (!type || v.content_type === type) && (!location || v.location === location) && (!profile || v.profile === profile),
  );
  const chip = (active: boolean) =>
    `h-8 cursor-pointer whitespace-nowrap rounded-full border px-3 text-[12.5px] font-semibold tracking-[0.04em] ${active ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"}`;
  const action = "h-8 cursor-pointer whitespace-nowrap rounded-md border border-line2 bg-transparent px-2.5 text-[12.5px] font-medium text-ink2 hover:border-ink hover:text-ink disabled:opacity-50";

  const meta = (v: Task) => {
    if (tab === "dropped") return v.dropped_at ? t("droppedOn", { date: formatDate(v.dropped_at) }) : "";
    if (v.shoot) {
      const where = v.shoot.location ? ` · ${v.shoot.location}` : "";
      if (tab === "shoot" && v.shoot.date < today) return t("notShotOn", { date: formatDate(v.shoot.date) }) + where;
      return (tab === "ready" ? t("shotOn", { date: formatDate(v.shoot.date) }) : t("shootOn", { date: formatDate(v.shoot.date) })) + where;
    }
    return "";
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-[120px] pt-5 lg:px-10 lg:pb-12">
      {(types.length > 1 || locations.length > 1 || profiles.length > 1) && (
        <div className="flex flex-wrap gap-1.5">
          {profiles.length > 1 && (
            <>
              {profiles.map((x) => (
                <button key={x} type="button" onClick={() => setProfile(profile === x ? null : x)} className={chip(profile === x)}>
                  {x}
                </button>
              ))}
              <span className="mx-1 h-8 w-px bg-line2" />
            </>
          )}
          {types.map((x) => (
            <button key={x} type="button" onClick={() => setType(type === x ? null : x)} className={chip(type === x)}>
              {x}
            </button>
          ))}
          {types.length > 1 && locations.length > 1 && <span className="mx-1 h-8 w-px bg-line2" />}
          {locations.map((x) => (
            <button key={x} type="button" onClick={() => setLocation(location === x ? null : x)} className={chip(location === x)}>
              {x}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line2 px-4 py-10 text-center text-[14px] text-ink3">{t(`empty.${tab}`)}</p>
      ) : (
        <div className="snf-stack">
          {shown.map((v) => {
            const first = v.script.find((s) => s.text.trim());
            const m = meta(v);
            const disabled = busy === v.id;
            return (
              <div key={v.id} className={`flex flex-col gap-3 border-t border-line px-4 py-3.5 first:border-t-0 lg:flex-row lg:items-center lg:gap-6 ${disabled ? "opacity-60" : ""}`}>
                <TaskLink id={v.id} className="flex min-w-0 flex-1 flex-col gap-1.5 hover:opacity-80">
                  <span className="flex items-center gap-2">
                    {v.content_type && (
                      <span className="flex-none rounded-[3px] border border-line2 px-1.5 py-1 text-[10.5px] font-semibold leading-none tracking-[0.08em] text-ink2">
                        {v.content_type}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-[15px] font-medium leading-snug text-ink">{v.title}</span>
                  </span>
                  {(v.profile || v.on_camera || v.location || m) && (
                    <span className="truncate text-[12.5px] text-ink3">{[v.profile, v.on_camera, v.location, m].filter(Boolean).join(" · ")}</span>
                  )}
                  {v.script_decision && <ScriptDecisionBadge decision={v.script_decision} />}
                  {first && (
                    <span className="line-clamp-2 max-w-[720px] text-[13px] leading-snug text-ink2">
                      {first.label && <span className="mr-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-accent">{first.label}</span>}
                      {first.text}
                    </span>
                  )}
                </TaskLink>

                <div className="flex flex-none flex-wrap items-center gap-2">
                  {(tab === "ideas" || tab === "shoot") && shoots.length > 0 && (
                    <select
                      value=""
                      disabled={disabled}
                      aria-label={t("toShoot")}
                      onChange={(e) => e.target.value && run(v.id, () => addVideosToShoot(e.target.value, [{ id: v.id, time: null }]))}
                      className={`${action} appearance-none`}
                    >
                      <option value="">{t("toShoot")}</option>
                      {shoots
                        .filter((s) => s.id !== v.shoot_id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatDate(s.date)}
                            {s.location ? ` · ${s.location}` : ""}
                          </option>
                        ))}
                    </select>
                  )}
                  {tab === "shoot" && (
                    <button type="button" disabled={disabled} onClick={() => run(v.id, () => removeFromShoot(v.id))} className={action}>
                      {t("backToIdeas")}
                    </button>
                  )}
                  {tab === "ready" && (
                    <DatePicker
                      value={null}
                      today={today}
                      disabled={disabled}
                      align="right"
                      emptyLabel={t("schedule")}
                      onChange={(d) => d && run(v.id, () => updateTask(v.id, { publish_date: d }))}
                    />
                  )}
                  {tab === "dropped" ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => run(v.id, () => updateTask(v.id, { dropped_at: null, status: "todo" }))}
                      className={action}
                    >
                      {t("restore")}
                    </button>
                  ) : (
                    <button type="button" disabled={disabled} onClick={() => run(v.id, () => updateTask(v.id, { dropped_at: today }))} className={`${action} text-ink3`}>
                      {t("drop")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
