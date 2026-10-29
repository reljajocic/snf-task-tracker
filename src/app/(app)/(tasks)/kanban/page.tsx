import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { PersonFilter } from "@/components/tasks/PersonFilter";
import { shortNames } from "@/lib/short-names";
import { Segmented } from "@/components/ui/Segmented";
import { getLookups, getTasks } from "@/lib/data";
import { addDays, today as getToday } from "@/lib/dates";

// Done column shows the last 14 days so it doesn't grow forever.
const DONE_WINDOW_DAYS = 14;

export default async function KanbanPage({ searchParams }: PageProps<"/kanban">) {
  const [{ who, kind }, all, lookups, t] = await Promise.all([
    searchParams,
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
  // Phones: everyone or one person, behind "Filters" with the kind (the cards come first).
  const names = shortNames(people);
  const peopleSeg = [
    { key: "all", label: t("list.everyone"), href: q({ who: null }), active: !person },
    ...people.map((p) => ({ key: p.id, label: names[p.id], href: q({ who: p.id }), active: person === p.id })),
  ];
  const activeFilters = (person ? 1 : 0) + (kindFilter === "all" ? 0 : 1);

  return (
    <>
      <PageHeader title={t("kanban.title")} border phoneTitle={false} actions={<span className="hidden gap-3.5 lg:flex"><Segmented items={kindSeg} /><PersonFilter people={people} value={person} hrefFor={personHrefs} /></span>} />
      <details className="group px-5 pt-4 lg:hidden">
        <summary className={`inline-flex h-10 cursor-pointer list-none items-center rounded-full border px-4 text-[14px] font-medium [&::-webkit-details-marker]:hidden ${activeFilters ? "border-ink2 text-ink" : "border-line2 text-ink2"}`}>
          {activeFilters ? t("list.filtersN", { count: activeFilters }) : t("list.filters")}
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-[10px] border border-line bg-surf p-3">
          <Segmented items={peopleSeg} size="sm" scroll />
          <Segmented items={kindSeg} size="sm" scroll />
        </div>
      </details>
      <KanbanBoard tasks={tasks} today={today} />
    </>
  );
}
