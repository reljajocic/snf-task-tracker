import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PriorityMark, StatusDot, TaskMeta, dueTone } from "@/components/tasks/bits";
import { TaskLink } from "@/components/tasks/links";
import { AvatarStack } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth";
import { CLIENT_STATUS_COLOR, PROJECT_STATUS_COLOR, getClient } from "@/lib/clients";
import { getLookups, getTasks } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { byDue } from "@/lib/tasks";
import { SOCIAL_LABEL, socialDisplay, socialUrl } from "@/lib/socials";
import { ClientTeam } from "./ClientTeam";

const TONE = { late: "bg-red-bg text-red-ink", today: "bg-rust-bg text-rust-ink", normal: "bg-chip text-ink" };

// 6b / 6d
export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const [{ id }, { tab }, me, lookups, t] = await Promise.all([params, searchParams, requireProfile(), getLookups(), getTranslations()]);
  const showDone = tab === "done";
  const [data, tasks] = await Promise.all([getClient(id), getTasks({ includeDone: true })]);
  if (!data) notFound();
  const { client, projects, members } = data;
  const today = getToday();

  const isAdmin = me.role === "admin";
  const canManage = isAdmin || members.some((m) => m.profile.id === me.id && m.role === "manager");
  const clientTasks = tasks.filter((x) => x.client?.id === client.id);
  const shown = clientTasks.filter((x) => (showDone ? x.status === "done" : x.status !== "done")).sort(byDue);

  const newTaskHref = `?new=1&client=${client.id}`;
  const tabLink = (key: "open" | "done") => (
    <Link
      href={key === "open" ? `/clients/${client.id}` : `/clients/${client.id}?tab=done`}
      scroll={false}
      className={`flex h-[34px] items-center rounded-full border px-3.5 text-[13px] font-medium ${
        (key === "done") === showDone ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2"
      }`}
    >
      {t(key === "open" ? "clients.openTab" : "clients.doneTab")}
    </Link>
  );
  const h2 = (text: string) => <h2 className="display text-[19px] leading-[1.1] lg:text-[20px]">{text}</h2>;

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-5 border-b border-line px-5 pb-6 pt-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-7">
        <div className="flex min-w-0 flex-col gap-3.5">
          <Link href="/clients" className="text-[14px] font-medium text-ink3 hover:text-ink">
            {t("clients.back")}
          </Link>
          <h1 className="display text-[32px] lg:text-[44px]">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-[7px] whitespace-nowrap rounded-full border border-line2 px-2.5 py-1.5 text-[13px] font-medium leading-none">
              <span className="size-2 rounded-full" style={{ background: CLIENT_STATUS_COLOR[client.status] }} />
              {t(`clientStatus.${client.status}`)}
            </span>
            {client.services.map((s) => (
              <span key={s} className="whitespace-nowrap rounded-full bg-chip px-2.5 py-1.5 text-[13px] font-medium leading-none text-ink2">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href={`/clients/${client.id}/edit`} className="flex h-[42px] items-center rounded-[7px] border border-line2 px-4 text-[14px] font-medium">
              {t("clients.edit")}
            </Link>
          )}
          <Link href={newTaskHref} scroll={false} className={buttonClass({ size: "sm", className: "hidden lg:inline-flex" })}>
            {t("common.newTask")}
          </Link>
        </div>
      </header>

      {/* The client's content first: that's where most of the day goes. */}
      <nav className="grid grid-cols-2 gap-2 border-b border-line px-5 py-4 sm:flex sm:flex-wrap lg:px-10">
        {[
          { href: `/content/videos?client=${client.id}`, label: t("nav.videos") },
          { href: `/content/schedule?client=${client.id}`, label: t("nav.schedule") },
          { href: `/content/shoots?client=${client.id}`, label: t("nav.shoots") },
          ...(canManage ? [{ href: `/clients/${client.id}/portal`, label: t("portalSettings.title") }] : []),
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surf px-4 text-[14.5px] font-medium hover:border-line2">
            {l.label} <span className="text-ink3">→</span>
          </Link>
        ))}
        {client.drive_url && (
          <a href={client.drive_url} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surf px-4 text-[14.5px] font-medium hover:border-line2">
            {t("clients.drive")}
          </a>
        )}
      </nav>

      <div className="grid grid-cols-1 items-start gap-9 px-5 pb-[120px] pt-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:px-10 lg:pb-10 wide:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-9">
          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              {h2(t("clients.tasks"))}
              <div className="flex gap-1.5">
                {tabLink("open")}
                {tabLink("done")}
              </div>
            </div>
            {shown.length ? (
              <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surf">
                {shown.map((x) => (
                  <TaskLink
                    key={x.id}
                    id={x.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-[18px] py-3.5 last:border-b-0 hover:bg-chip lg:grid-cols-[minmax(0,1fr)_100px_60px_120px] wide:grid-cols-[minmax(0,1fr)_100px_150px_60px_120px] ${x.status === "done" ? "opacity-60" : ""}`}
                  >
                    <div className="flex min-w-0 flex-col gap-[5px]">
                      <span className={`text-[15px] font-medium leading-snug ${x.status === "done" ? "line-through" : ""}`}>{x.title}</span>
                      <span className="text-[13px] leading-tight text-ink2">
                        {[x.project?.name, x.type ? t(`taskType.${x.type}`) : null].filter(Boolean).join(" · ") || <TaskMeta task={x} />}
                      </span>
                    </div>
                    <span className="hidden lg:block"><PriorityMark priority={x.priority} /></span>
                    <span className="hidden wide:block"><StatusDot status={x.status} /></span>
                    <span className="hidden lg:block"><AvatarStack people={x.assignees} size={26} /></span>
                    {x.due_date ? (
                      <span className={`justify-self-end whitespace-nowrap rounded-[5px] px-[9px] py-1.5 text-[13px] font-semibold leading-none ${TONE[dueTone(x, today)]}`}>
                        {formatDate(x.due_date)}
                      </span>
                    ) : (
                      <span />
                    )}
                  </TaskLink>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("clients.noTasks")}</p>
            )}
          </section>

          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              {h2(t("clients.projects"))}
              {canManage && (
                <Link href={`/clients/${client.id}/projects/new`} className="text-[14px] font-medium text-rust-ink">
                  {t("clients.newProject")}
                </Link>
              )}
            </div>
            {projects.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => {
                  const pt = clientTasks.filter((x) => x.project?.id === p.id);
                  const done = pt.filter((x) => x.status === "done").length;
                  const pct = pt.length ? Math.round((done / pt.length) * 100) : 0;
                  const people = lookups.people.filter((u) => p.members.includes(u.id));
                  const card = (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[16px] font-medium leading-tight">{p.name}</span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-ink2">
                          <span className="size-[7px] rounded-full" style={{ background: PROJECT_STATUS_COLOR[p.status] }} />
                          {t(`projectStatus.${p.status}`)}
                        </span>
                      </div>
                      {p.description && <span className="text-[14px] leading-snug text-ink2">{p.description}</span>}
                      <div className="flex flex-col gap-[7px]">
                        <div className="h-1.5 overflow-hidden rounded-[3px] bg-chip">
                          <div className="h-full bg-[var(--status-done)]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-ink3">{t("clients.projectCounts", { open: pt.length - done, done })}</span>
                          <AvatarStack people={people} size={22} />
                        </div>
                      </div>
                    </>
                  );
                  const cls = "flex flex-col gap-3.5 rounded-lg border border-line bg-surf p-[18px]";
                  return canManage ? (
                    <Link key={p.id} href={`/clients/${client.id}/projects/${p.id}`} className={`${cls} hover:border-line2`}>
                      {card}
                    </Link>
                  ) : (
                    <div key={p.id} className={cls}>{card}</div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("clients.noProjects")}</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-9">
          <section className="flex flex-col gap-3.5">
            {h2(t("clients.contact"))}
            <dl className="flex flex-col rounded-lg border border-line bg-surf px-4 py-1.5">
              {[
                [t("clients.email"), client.email && <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>],
                ...client.socials.map((so) => [
                  SOCIAL_LABEL[so.platform],
                  <a key={so.handle} href={socialUrl(so)} target="_blank" rel="noreferrer" className="hover:underline">
                    {socialDisplay(so)}
                  </a>,
                ]),
                [t("clients.city"), client.city],
                [t("clients.locations"), client.locations.length ? client.locations.join(", ") : null],
              ]
                .filter(([, v]) => v)
                .map(([k, v], i) => (
                  <div key={`${String(k)}-${i}`} className="flex justify-between gap-4 border-b border-line py-3 text-[14px] last:border-b-0">
                    <dt className="text-ink3">{k}</dt>
                    <dd className="min-w-0 truncate text-right text-ink">{v}</dd>
                  </div>
                ))}
              {!client.email && !client.socials.length && !client.city && !client.locations.length && <div className="py-3 text-[14px] text-ink3">—</div>}
            </dl>
            {client.notes && <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink2">{client.notes}</p>}
          </section>

          <ClientTeam
            clientId={client.id}
            members={members.map((m) => ({ ...m.profile, role: m.role }))}
            people={lookups.people}
            canManage={canManage}
          />
        </aside>
      </div>
    </div>
  );
}
