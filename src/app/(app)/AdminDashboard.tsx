import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { getShootDays } from "@/lib/content";
import { getLookups, getTasks } from "@/lib/data";
import { addDays, formatDate, formatShortDate, today as getToday, weekdayIndex } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { PHASES, PUBLISHED_PHASE, taskOverdue, type Task } from "@/lib/tasks";

// What happened, by colour: the client's word from the portal (approved / asked for changes), a cut sent to them,
// new work, finished work.
const KINDS = ["approved", "changes", "sent", "created", "done"] as const;
type Kind = (typeof KINDS)[number];
const KIND_COLOR: Record<Kind, string> = {
  approved: "var(--accent)",
  changes: "var(--status-waiting)",
  sent: "var(--status-todo)",
  created: "var(--status-in-progress)",
  done: "var(--status-done)",
};

// The admin's home: a read-out of the whole studio, not a to-do list. Every client (work open, late,
// waiting on the client, videos per phase, next shoot and post), the team's load, and what happened lately.
export async function AdminDashboard() {
  const supabase = await createClient();
  const today = getToday();
  const weekAgo = addDays(today, -7);
  const [tasks, lookups, shoots, t, { data: portal }] = await Promise.all([
    getTasks({ includeDone: true }),
    getLookups(),
    getShootDays(),
    getTranslations(),
    supabase.from("portal_activity").select("id, message, created_at, client:clients(id, name)").order("created_at", { ascending: false })
      .limit(15)
      .returns<{ id: string; message: string; created_at: string; client: { id: string; name: string } | null }[]>(),
  ]);

  const open = tasks.filter((x) => x.status !== "done" && !x.dropped_at && (x.kind !== "video" || (x.phase ?? 0) < PUBLISHED_PHASE));
  const late = (x: Task) => x.status !== "waiting_client" && taskOverdue(x, today);
  const waiting = (x: Task) => x.status === "waiting_client";
  const doneThisWeek = tasks.filter((x) => x.status === "done" && x.completed_at && x.completed_at.slice(0, 10) >= weekAgo);

  const clients = lookups.clients
    .map((c) => {
      const mine = open.filter((x) => x.client?.id === c.id);
      const videos = mine.filter((x) => x.kind === "video");
      const phases = PHASES.map((_, i) => videos.filter((v) => Math.min(v.phase ?? 0, PHASES.length - 1) === i).length);
      const nextShoot = shoots.filter((s) => s.client?.id === c.id && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
      const nextPost = videos.filter((v) => v.publish_date && v.publish_date >= today).sort((a, b) => a.publish_date!.localeCompare(b.publish_date!))[0];
      return { id: c.id, name: c.name, open: mine.length, late: mine.filter(late).length, waiting: mine.filter(waiting).length, phases, nextShoot, nextPost };
    })
    .filter((c) => c.open > 0 || c.nextShoot)
    .sort((a, b) => b.late - a.late || b.open - a.open || a.name.localeCompare(b.name));

  const people = lookups.people
    .map((p) => {
      const mine = open.filter((x) => x.assignees.some((a) => a.id === p.id));
      return {
        person: p,
        open: mine.length,
        late: mine.filter(late).length,
        waiting: mine.filter(waiting).length,
        done: doneThisWeek.filter((x) => x.assignees.some((a) => a.id === p.id)).length,
      };
    })
    .filter((s) => s.open > 0 || s.done > 0)
    .sort((a, b) => b.late - a.late || b.open - a.open);

  // Lately: the clients' word from the portal, new work and finished work, newest first.
  type Event = { at: string; kind: Kind; text: string; who?: string; href?: string };
  const events: Event[] = [
    // Portal messages are written as "<name> approved …", "<name> asked for …" (the portal's actions)
    // and "Version n of … sent for review" (task-actions).
    ...(portal ?? []).map((a) => ({
      at: a.created_at,
      kind: (/sent for review/.test(a.message) ? "sent" : / approved /.test(a.message) ? "approved" : "changes") as Kind,
      text: a.message,
      who: a.client?.name,
      href: a.client ? `/clients/${a.client.id}` : undefined,
    })),
    ...tasks
      .filter((x) => x.created_at.slice(0, 10) >= weekAgo && x.kind !== "subtask")
      .map((x) => ({ at: x.created_at, kind: "created" as Kind, text: x.title, who: x.client?.name, href: `?task=${x.id}` })),
    ...doneThisWeek
      .filter((x) => x.kind !== "subtask")
      .map((x) => ({ at: x.completed_at!, kind: "done" as Kind, text: t("admin.done", { title: x.title, who: x.assignees.map((a) => a.full_name.split(" ")[0]).join(", ") || "—" }), who: x.client?.name, href: `?task=${x.id}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25);

  const totals = [
    { label: t("admin.activeClients"), value: clients.length },
    { label: t("admin.openWork"), value: open.length },
    { label: t("admin.late"), value: open.filter(late).length, red: true },
    { label: t("admin.waitingClient"), value: open.filter(waiting).length },
    { label: t("admin.doneWeek"), value: doneThisWeek.length },
  ];

  const eyebrow = `${t("weekday.long", { day: String(weekdayIndex(today)) })}, ${formatDate(today)}`;
  const h2 = (text: string, sub?: string) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{text}</h2>
      {sub && <span className="text-[13px] text-ink3">{sub}</span>}
    </div>
  );
  const num = (n: number, red = false) => <span className={`tabular-nums ${n === 0 ? "text-ink3" : red ? "font-semibold text-red-ink" : "text-ink"}`}>{n}</span>;
  const when = (iso: string) => {
    const d = iso.slice(0, 10);
    return d === today ? iso.slice(11, 16) : formatShortDate(d);
  };

  return (
    <>
      <PageHeader title={t("admin.title")} eyebrow={eyebrow} border newTask={false} />
      <div className="flex flex-col gap-9 px-5 pb-[calc(120px+env(safe-area-inset-bottom))] lg:px-10 lg:pb-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {totals.map((s) => (
            <div key={s.label} className="flex flex-col gap-2 rounded-lg border border-line bg-surf p-4">
              <span className="text-[13px] font-medium text-ink3">{s.label}</span>
              <span className={`display text-[34px] leading-none ${s.red && s.value > 0 ? "text-red-ink" : ""}`}>{s.value}</span>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-3">
          {h2(t("admin.clients"), t("admin.clientsHint"))}
          <div className="snf-stack overflow-x-auto">
            <div className="hidden min-w-[880px] grid-cols-[minmax(160px,1fr)_60px_60px_70px_repeat(5,44px)_130px_130px] gap-3 border-b border-line px-[18px] py-2.5 text-[12px] font-medium text-ink3 lg:grid">
              <span />
              <span className="text-right">{t("admin.colOpen")}</span>
              <span className="text-right">{t("admin.colLate")}</span>
              <span className="text-right">{t("admin.colWaiting")}</span>
              {PHASES.map((p) => <span key={p} className="truncate text-right" title={t(`phase.${p}`)}>{t(`phase.${p}`).slice(0, 4)}</span>)}
              <span>{t("admin.colNextShoot")}</span>
              <span>{t("admin.colNextPost")}</span>
            </div>
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-line px-[18px] py-3 text-[14px] last:border-b-0 hover:bg-hover lg:min-w-[880px] lg:grid-cols-[minmax(160px,1fr)_60px_60px_70px_repeat(5,44px)_130px_130px] lg:items-center lg:gap-3"
              >
                <span className="truncate text-[15px] font-medium">{c.name}</span>
                {/* Phone: one line of the essentials. */}
                <span className="text-[13px] text-ink3 lg:hidden">
                  {t("admin.mobileLine", { open: c.open, late: c.late, waiting: c.waiting })}
                </span>
                <span className="hidden text-right lg:block">{num(c.open)}</span>
                <span className="hidden text-right lg:block">{num(c.late, true)}</span>
                <span className="hidden text-right lg:block">{num(c.waiting)}</span>
                {c.phases.map((n, i) => <span key={i} className="hidden text-right lg:block">{num(n)}</span>)}
                <span className="col-span-2 text-[13px] text-ink2 lg:col-span-1 lg:text-[14px]">
                  <span className="lg:hidden">{t("admin.colNextShoot")}: </span>
                  {c.nextShoot ? formatShortDate(c.nextShoot.date) : "—"}
                </span>
                <span className="col-span-2 truncate text-[13px] text-ink2 lg:col-span-1 lg:text-[14px]">
                  <span className="lg:hidden">{t("admin.colNextPost")}: </span>
                  {c.nextPost ? formatShortDate(c.nextPost.publish_date!) : "—"}
                </span>
              </Link>
            ))}
            {!clients.length && <p className="px-[18px] py-5 text-[14px] text-ink3">{t("admin.nothing")}</p>}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-3">
            {h2(t("admin.team"))}
            <div className="snf-stack">
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,64px)] gap-3 border-b border-line px-[18px] py-2.5 text-[12px] font-medium text-ink3">
                <span />
                <span className="text-right">{t("admin.colOpen")}</span>
                <span className="text-right">{t("admin.colLate")}</span>
                <span className="text-right">{t("admin.colWaiting")}</span>
                <span className="text-right">{t("admin.colDoneWeek")}</span>
              </div>
              {people.map((s) => (
                <div key={s.person.id} className="grid grid-cols-[minmax(0,1fr)_repeat(4,64px)] items-center gap-3 border-b border-line px-[18px] py-3 text-[14px] last:border-b-0">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar person={s.person} size={26} />
                    <span className="truncate text-[15px] font-medium">{s.person.full_name}</span>
                  </span>
                  <span className="text-right">{num(s.open)}</span>
                  <span className="text-right">{num(s.late, true)}</span>
                  <span className="text-right">{num(s.waiting)}</span>
                  <span className="text-right">{num(s.done)}</span>
                </div>
              ))}
              {!people.length && <p className="px-[18px] py-5 text-[14px] text-ink3">{t("admin.nothing")}</p>}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            {h2(t("admin.activity"), t("admin.activityHint"))}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {KINDS.map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-[12px] font-medium text-ink2">
                  <span className="size-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
                  {t(`admin.kind.${k}`)}
                </span>
              ))}
            </div>
            <div className="snf-stack">
              {events.map((e, i) => {
                const body = (
                  <>
                    <span className="w-[52px] flex-none pt-px text-[12px] tabular-nums text-ink3">{when(e.at)}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: KIND_COLOR[e.kind] }}>
                        {t(`admin.kind.${e.kind}`)}
                      </span>
                      <span className="text-[14px] leading-snug text-ink">{e.text}</span>
                      {e.who && <span className="truncate text-[12px] text-ink3">{e.who}</span>}
                    </span>
                  </>
                );
                const cls = "flex gap-3 border-b border-l-[3px] border-b-line px-[18px] py-3 last:border-b-0";
                return e.href ? (
                  <Link key={i} href={e.href} className={`${cls} hover:bg-hover`} style={{ borderLeftColor: KIND_COLOR[e.kind] }}>{body}</Link>
                ) : (
                  <div key={i} className={cls} style={{ borderLeftColor: KIND_COLOR[e.kind] }}>{body}</div>
                );
              })}
              {!events.length && <p className="px-[18px] py-5 text-[14px] text-ink3">{t("admin.nothing")}</p>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
