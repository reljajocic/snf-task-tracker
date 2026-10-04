import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth";
import { ClientMark } from "@/components/ClientMark";
import { CLIENT_STATUSES, CLIENT_STATUS_COLOR, getClients, type ClientStatus } from "@/lib/clients";
import { getTasks } from "@/lib/data";
import { formatDate, today as getToday } from "@/lib/dates";
import { byDue, taskOverdue } from "@/lib/tasks";

const GRID =
  "grid grid-cols-[minmax(200px,1.2fr)_110px_minmax(0,1.3fr)_100px_minmax(0,1.4fr)] gap-4 xl:grid-cols-[minmax(210px,1.2fr)_120px_minmax(0,1.3fr)_110px_minmax(0,1.4fr)_110px]";

// 6a / 6c
export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const [{ status }, , clients, tasks, t] = await Promise.all([
    searchParams,
    requireProfile(),
    getClients(),
    getTasks(),
    getTranslations(),
  ]);
  const today = getToday();
  const tab = CLIENT_STATUSES.includes(status as ClientStatus) ? (status as ClientStatus) : null;
  const shown = clients.filter((c) => !tab || c.status === tab);

  const tabs = [
    { key: "all", label: t("clients.all"), count: clients.length, href: "/clients", active: !tab },
    ...CLIENT_STATUSES.map((s) => ({
      key: s,
      label: t(`clients.tabs.${s}`),
      count: clients.filter((c) => c.status === s).length,
      href: `/clients?status=${s}`,
      active: tab === s,
    })),
  ];

  const rows = shown.map((c) => {
    const open = tasks.filter((x) => x.client?.id === c.id).sort(byDue);
    const late = open.filter((x) => x.status !== "waiting_client" && taskOverdue(x, today)).length;
    const next = open.find((x) => x.due_date);
    return { client: c, open: open.length, late, next };
  });

  const newButton = (
    <Link href="/clients/new" className={buttonClass({ size: "sm" })}>
      {t("clients.new")}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("clients.title")} newTask={false} actions={newButton} />
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-line px-5 pb-[18px] lg:px-10">
        {tabs.map((tb) => (
          <Link
            key={tb.key}
            href={tb.href}
            scroll={false}
            className={`flex h-[38px] flex-none items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-medium ${
              tb.active ? "border-seg bg-seg text-seg-ink" : "border-line2 text-ink2 hover:text-ink"
            }`}
          >
            {tb.label}
            <span className="opacity-60">{tb.count}</span>
          </Link>
        ))}
      </div>

      {/* Mobile cards (6c) */}
      <div className="flex flex-col gap-2.5 px-5 pb-[120px] pt-4 lg:hidden">
        {rows.map(({ client: c, open, late }) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-3 rounded-[10px] border border-line bg-surf p-4">
            <ClientMark client={c} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="truncate text-[17px] font-medium leading-tight">{c.name}</span>
              <span className="flex items-center gap-2 text-[13px] text-ink2">
                <span className="size-2 rounded-full" style={{ background: CLIENT_STATUS_COLOR[c.status] }} />
                {t(`clientStatus.${c.status}`)}
                {c.city && <span className="text-ink3">· {c.city}</span>}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="display text-[22px] leading-none">{open}</span>
              {late > 0 && <span className="whitespace-nowrap text-[12px] font-semibold text-red-ink">{t("clients.late", { count: late })}</span>}
            </div>
          </Link>
        ))}
        {!rows.length && <p className="py-12 text-center text-[15px] text-ink3">{clients.length ? t("clients.empty") : t("clients.none")}</p>}
      </div>

      {/* Desktop table (6a) */}
      <div className="hidden px-10 pb-10 lg:block">
        <div className={`${GRID} border-b border-line px-4 pb-2.5 pt-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-ink3`}>
          <span>{t("clients.col.client")}</span>
          <span>{t("clients.col.status")}</span>
          <span>{t("clients.col.services")}</span>
          <span>{t("clients.col.open")}</span>
          <span>{t("clients.col.next")}</span>
          <span className="hidden xl:block">{t("clients.col.since")}</span>
        </div>
        {rows.map(({ client: c, open, late, next }) => (
          <Link key={c.id} href={`/clients/${c.id}`} className={`${GRID} items-center border-b border-line p-4 hover:bg-chip`}>
            <div className="flex min-w-0 items-center gap-3">
              <ClientMark client={c} size={38} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[16px] font-medium leading-tight">{c.name}</span>
                <span className="text-[13px] leading-tight text-ink3">{c.city ?? ""}</span>
              </div>
            </div>
            <span className="flex items-center gap-[7px] whitespace-nowrap text-[13px] font-medium text-ink2">
              <span className="size-2 rounded-full" style={{ background: CLIENT_STATUS_COLOR[c.status] }} />
              {t(`clientStatus.${c.status}`)}
            </span>
            <div className="flex flex-wrap gap-[5px]">
              {c.services.map((s) => (
                <span key={s} className="whitespace-nowrap rounded-xl border border-line2 px-2 py-[5px] text-[12px] font-medium leading-none text-ink2">{s}</span>
              ))}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="display text-[22px] leading-none">{open}</span>
              {late > 0 && <span className="whitespace-nowrap text-[12px] font-semibold text-red-ink">{t("clients.late", { count: late })}</span>}
            </div>
            <div className="flex min-w-0 flex-col gap-[5px]">
              <span className="truncate text-[14px] font-medium leading-snug">{next?.title ?? "—"}</span>
              {next?.due_date && (
                <span className={`text-[13px] font-medium leading-none ${taskOverdue(next, today) ? "text-red-ink" : "text-ink2"}`}>{formatDate(next.due_date)}</span>
              )}
            </div>
            <span className="hidden text-[14px] text-ink2 xl:block">{c.since ? `${c.since.slice(5, 7)}.${c.since.slice(0, 4)}` : "—"}</span>
          </Link>
        ))}
        {!rows.length && <div className="px-4 py-12 text-center text-[15px] text-ink3">{clients.length ? t("clients.empty") : t("clients.none")}</div>}
      </div>
    </>
  );
}
