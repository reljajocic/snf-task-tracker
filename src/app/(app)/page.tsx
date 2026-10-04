import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { RowList, TaskCardMobile, TaskRow, TaskRowMobile, WaitingCard } from "@/components/tasks/rows";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { requireProfile } from "@/lib/auth";
import { getLookups, getTasks } from "@/lib/data";
import { addDays, formatDate, formatShortDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { byDue, taskOverdue, type Task } from "@/lib/tasks";

// 1a / 1b. What Home shows: members their own tasks; a client's managers all of that client's work;
// the admin everything. "Mine / All" (for those who oversee) narrows the sections to their own.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [{ scope }, me, tasks, lookups, t] = await Promise.all([
    searchParams,
    requireProfile(),
    getTasks(),
    getLookups(),
    getTranslations(),
  ]);
  const today = getToday();
  // Admins and managers oversee others' work, so they land on "All"; members on "Mine".
  const managed = new Set(lookups.clients.filter((c) => c.canManage).map((c) => c.id));
  const isMine = (x: Task) => x.assignees.some((a) => a.id === me.id) || (!x.client && x.created_by === me.id);
  const visible = lookups.me.isAdmin ? tasks : tasks.filter((x) => isMine(x) || (x.client !== null && managed.has(x.client.id)));
  const oversees = lookups.me.isAdmin || managed.size > 0;
  const mineOnly = !oversees || scope === "mine";
  const scoped = mineOnly ? visible.filter(isMine) : visible;

  const lateAndToday = scoped
    .filter((x) => x.status !== "waiting_client" && x.due_date && x.due_date <= today)
    .sort(byDue);
  const nLate = lateAndToday.filter((x) => taskOverdue(x, today)).length;

  const weekEnd = addDays(today, 7);
  const week = scoped
    .filter((x) => x.status !== "waiting_client" && x.due_date && x.due_date > today && x.due_date <= weekEnd)
    .sort(byDue);
  const groups: { date: string; label: string; items: Task[] }[] = [];
  for (const x of week) {
    const d = x.due_date!;
    let g = groups.find((g) => g.date === d);
    if (!g) {
      g = { date: d, label: `${t("weekday.long", { day: String(weekdayIndex(d)) })}, ${formatShortDate(d)}`, items: [] };
      groups.push(g);
    }
    g.items.push(x);
  }

  // Open tasks without a deadline would otherwise appear nowhere on Home.
  const noDeadline = scoped
    .filter((x) => x.status !== "waiting_client" && !x.due_date)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const waiting = scoped
    .filter((x) => x.status === "waiting_client")
    .sort((a, b) => a.status_changed_at.localeCompare(b.status_changed_at));

  // Team stats (everything this person oversees, regardless of the toggle).
  const people = lookups.people
    .map((p) => {
      const mine = visible.filter((x) => x.assignees.some((a) => a.id === p.id));
      const late = mine.filter((x) => x.status !== "waiting_client" && taskOverdue(x, today)).length;
      return { person: p, count: mine.length, late };
    })
    .filter((s) => s.count > 0 || s.person.id === me.id);

  const byClient = new Map<string, { name: string; count: number }>();
  for (const x of visible) {
    const key = x.client?.id ?? "personal";
    const name = x.client?.name ?? t("task.noClient");
    byClient.set(key, { name, count: (byClient.get(key)?.count ?? 0) + 1 });
  }
  const clientStats = [...byClient.values()].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...clientStats.map((c) => c.count));

  const toggle = [
    { key: "mine", label: t("home.mine"), href: "/?scope=mine", active: mineOnly },
    { key: "all", label: t("home.all"), href: "/?scope=all", active: !mineOnly },
  ];
  const eyebrow = `${t("weekday.long", { day: String(weekdayIndex(today)) })}, ${formatDate(today)}`;
  const lateSummary = t("home.lateSummary", { late: nLate, today: lateAndToday.length - nLate });

  const sectionTitle = (text: string) => <h2 className="display whitespace-nowrap text-[19px] leading-[1.1] lg:text-[20px]">{text}</h2>;
  const empty = (text: string) => <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{text}</p>;

  return (
    <>
      <PageHeader title={t("home.title")} eyebrow={eyebrow} border actions={oversees ? <span className="hidden lg:flex"><Segmented items={toggle} /></span> : undefined} />

      {/* Mobile */}
      <div className="flex flex-col gap-7 px-5 pb-[120px] lg:hidden">
        {oversees && <Segmented items={toggle} full size="lg" />}
        <PeopleStats stats={people} compact />
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            {sectionTitle(t("home.todayLate"))}
            <span className="whitespace-nowrap text-[13px] font-semibold text-red-ink">{lateSummary}</span>
          </div>
          {lateAndToday.length ? lateAndToday.map((x) => <TaskCardMobile key={x.id} task={x} today={today} />) : empty(t("home.nothingToday"))}
        </section>
        <section className="flex flex-col gap-3">
          {sectionTitle(t("home.thisWeek"))}
          {groups.length
            ? groups.map((g) => (
                <div key={g.date} className="flex flex-col gap-2">
                  <div className="eyebrow pt-1 text-[12px]">{g.label}</div>
                  {g.items.map((x) => <TaskRowMobile key={x.id} task={x} />)}
                </div>
              ))
            : empty(t("home.nothingWeek"))}
        </section>
        {noDeadline.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              {sectionTitle(t("home.noDeadline"))}
              <span className="text-[13px] font-semibold text-ink3">{noDeadline.length}</span>
            </div>
            {noDeadline.map((x) => <TaskRowMobile key={x.id} task={x} />)}
          </section>
        )}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            {sectionTitle(t("home.waiting"))}
            <span className="text-[13px] font-semibold text-ink3">{waiting.length}</span>
          </div>
          {waiting.length ? waiting.map((x) => <WaitingCard key={x.id} task={x} today={today} large />) : empty(t("home.nothingWaiting"))}
        </section>
        <section className="flex flex-col gap-3">
          {sectionTitle(t("home.byClient"))}
          <div className="flex flex-col rounded-[10px] border border-line bg-surf px-4 py-1">
            {clientStats.map((c) => (
              <div key={c.name} className="flex items-center justify-between border-b border-line py-[13px] text-[15px] font-medium last:border-b-0">
                <span>{c.name}</span>
                <span className="font-semibold">{c.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Desktop */}
      <div className="hidden grid-cols-[minmax(0,1fr)_300px] items-start gap-10 wide:grid-cols-[minmax(0,1fr)_340px] px-10 pb-12 pt-8 lg:grid">
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline gap-3.5">
              {sectionTitle(t("home.todayLate"))}
              <span className="whitespace-nowrap text-[13px] font-semibold text-red-ink">{lateSummary}</span>
            </div>
            {lateAndToday.length ? (
              <RowList>{lateAndToday.map((x) => <TaskRow key={x.id} task={x} today={today} />)}</RowList>
            ) : (
              empty(t("home.nothingToday"))
            )}
          </section>
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline gap-3.5">
              {sectionTitle(t("home.thisWeek"))}
              <span className="whitespace-nowrap text-[13px] font-medium text-ink3">
                {t("home.weekRange", { from: formatShortDate(addDays(today, 1)), to: formatDate(weekEnd) })}
              </span>
            </div>
            {groups.length ? (
              <div className="flex flex-col gap-[18px]">
                {groups.map((g) => (
                  <div key={g.date} className="flex flex-col gap-2">
                    <div className="eyebrow text-[12px]">{g.label}</div>
                    <RowList>{g.items.map((x) => <TaskRow key={x.id} task={x} today={today} plainDate />)}</RowList>
                  </div>
                ))}
              </div>
            ) : (
              empty(t("home.nothingWeek"))
            )}
          </section>
          {noDeadline.length > 0 && (
            <section className="flex flex-col gap-3.5">
              <div className="flex items-baseline gap-3.5">
                {sectionTitle(t("home.noDeadline"))}
                <span className="whitespace-nowrap text-[13px] font-medium text-ink3">{t("home.noDeadlineHint")}</span>
              </div>
              <RowList>{noDeadline.map((x) => <TaskRow key={x.id} task={x} today={today} />)}</RowList>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline justify-between">
              {sectionTitle(t("home.open"))}
              <span className="text-[13px] font-medium text-ink3">{t("home.wholeTeam")}</span>
            </div>
            <PeopleStats stats={people} />
            {clientStats.length > 0 && (
              <div className="flex flex-col rounded-lg border border-line bg-surf px-4 py-1.5">
                {clientStats.map((c) => (
                  <div key={c.name} className="grid grid-cols-[110px_minmax(0,1fr)_24px] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                    <span className="truncate text-[14px] font-medium leading-tight">{c.name}</span>
                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-chip">
                      <div className="h-full rounded-[3px] bg-ink3" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-right text-[14px] font-semibold">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="flex flex-col gap-3.5">
            <div className="flex items-baseline justify-between">
              {sectionTitle(t("home.waiting"))}
              <span className="text-[13px] font-semibold text-ink3">{waiting.length}</span>
            </div>
            {waiting.length ? (
              <div className="flex flex-col gap-2">{waiting.map((x) => <WaitingCard key={x.id} task={x} today={today} />)}</div>
            ) : (
              empty(t("home.nothingWaiting"))
            )}
          </section>
        </div>
      </div>
    </>
  );
}

async function PeopleStats({
  stats,
  compact = false,
}: {
  stats: { person: { id: string; full_name: string; initials: string; avatar_bg: string; avatar_fg: string }; count: number; late: number }[];
  compact?: boolean;
}) {
  const t = await getTranslations("home");
  return (
    <div className={`grid gap-2.5 ${compact ? "grid-cols-3" : "grid-cols-[repeat(auto-fill,minmax(130px,1fr))]"}`}>
      {stats.map(({ person, count, late }) => (
        <div key={person.id} className={`flex flex-col border border-line bg-surf ${compact ? "gap-3 rounded-[10px] p-3.5" : "gap-3.5 rounded-lg p-4"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Avatar person={person} size={compact ? 26 : 24} />
            <span className={`truncate font-medium text-ink2 ${compact ? "text-[15px]" : "text-[14px]"}`}>{person.full_name.split(" ")[0]}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
            <span className={`display ${compact ? "text-[28px]" : "text-[40px]"} leading-[0.9]`}>{count}</span>
            {!compact && <span className="whitespace-nowrap text-[13px] text-ink3">{late ? t("lateShort", { count: late }) : t("noLate")}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

