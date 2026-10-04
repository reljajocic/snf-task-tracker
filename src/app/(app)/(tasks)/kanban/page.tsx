import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { PersonFilter } from "@/components/tasks/PersonFilter";
import { Segmented } from "@/components/ui/Segmented";
import { requireProfile } from "@/lib/auth";
import { getLookups, getTasks } from "@/lib/data";
import { addDays, today as getToday } from "@/lib/dates";

// Done column shows the last 14 days so it doesn't grow forever.
const DONE_WINDOW_DAYS = 14;

export default async function KanbanPage({ searchParams }: PageProps<"/kanban">) {
  const [{ who, kind }, me, all, lookups, t] = await Promise.all([
    searchParams,
    requireProfile(),
    getTasks({ includeDone: true }),
    getLookups(),
    getTranslations(),
  ]);
  const today = getToday();
  const cutoff = addDays(today, -DONE_WINDOW_DAYS);
  const person = typeof who === "string" ? who : null;
  const kindFilter = kind === "video" || kind === "other" ? kind : "all";

  const tasks = all.filter(
    (x) =>
      (x.status !== "done" || (x.completed_at ?? x.updated_at).slice(0, 10) >= cutoff) &&
      (!person || x.assignees.some((a) => a.id === person)) &&
      // "Video only" includes subtasks of videos; "Other" is plain tasks.
      (kindFilter === "all" || (kindFilter === "video" ? x.kind !== "task" : x.kind === "task")),
  );

  const q = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | null> = { who: person, kind: kindFilter === "all" ? null : kindFilter, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/kanban?${qs}` : "/kanban";
  };
  const kindSeg = (["all", "video", "other"] as const).map((k) => ({
    key: k,
    label: t(k === "all" ? "video.kindAll" : k === "video" ? "video.kindVideo" : "video.kindOther"),
    href: q({ kind: k === "all" ? null : k }),
    active: kindFilter === k,
  }));

  // Desktop: everyone, or one person (searchable list of the team). Mobile: me / everyone.
  const people = lookups.people;
  const personHrefs: Record<string, string> = { all: q({ who: null }), ...Object.fromEntries(people.map((p) => [p.id, q({ who: p.id })])) };
  const mobileSeg = [
    { key: "mine", label: t("home.mine"), href: q({ who: me.id }), active: person === me.id },
    { key: "all", label: t("home.all"), href: q({ who: null }), active: !person },
  ];

  return (
    <>
      <PageHeader title={t("kanban.title")} border actions={<span className="hidden gap-3.5 lg:flex"><Segmented items={kindSeg} /><PersonFilter people={people} value={person} hrefFor={personHrefs} /></span>} />
      <div className="flex flex-col gap-2.5 px-5 pb-1 lg:hidden">
        <Segmented items={kindSeg} full size="lg" />
        <Segmented items={mobileSeg} full />
      </div>
      <KanbanBoard tasks={tasks} today={today} />
    </>
  );
}
