import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { Segmented } from "@/components/ui/Segmented";
import { requireProfile } from "@/lib/auth";
import { getLookups, getTasks } from "@/lib/data";
import { addDays, today as getToday } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kanban");
  return { title: t("title") };
}

// Done column shows the last 14 days so it doesn't grow forever.
const DONE_WINDOW_DAYS = 14;

export default async function KanbanPage({ searchParams }: PageProps<"/kanban">) {
  const [{ who }, me, all, lookups, t] = await Promise.all([
    searchParams,
    requireProfile(),
    getTasks({ includeDone: true }),
    getLookups(),
    getTranslations(),
  ]);
  const today = getToday();
  const cutoff = addDays(today, -DONE_WINDOW_DAYS);
  const person = typeof who === "string" ? who : null;

  const tasks = all.filter(
    (x) =>
      (x.status !== "done" || (x.completed_at ?? x.updated_at).slice(0, 10) >= cutoff) &&
      (!person || x.assignees.some((a) => a.id === person)),
  );

  // Desktop: everyone + each person who has tasks. Mobile: me / everyone.
  const people = lookups.people.filter((p) => all.some((x) => x.assignees.some((a) => a.id === p.id)));
  const desktopSeg = [
    { key: "all", label: t("kanban.everyone"), href: "/kanban", active: !person },
    ...people.map((p) => ({ key: p.id, label: p.full_name.split(" ")[0], href: `/kanban?who=${p.id}`, active: person === p.id })),
  ];
  const mobileSeg = [
    { key: "mine", label: t("home.mine"), href: `/kanban?who=${me.id}`, active: person === me.id },
    { key: "all", label: t("home.all"), href: "/kanban", active: !person },
  ];

  return (
    <>
      <PageHeader title={t("kanban.title")} border actions={<span className="hidden lg:flex"><Segmented items={desktopSeg} /></span>} />
      <div className="px-5 pb-1 lg:hidden">
        <Segmented items={mobileSeg} full size="lg" />
      </div>
      <KanbanBoard tasks={tasks} today={today} />
    </>
  );
}
