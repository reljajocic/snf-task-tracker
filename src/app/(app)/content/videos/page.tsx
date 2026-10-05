import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { countDropped, getClientVideos, getShootDays } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { rememberedClient } from "@/lib/remembered-client";
import { today as getToday } from "@/lib/dates";
import type { Task } from "@/lib/tasks";
import { ClientPicker } from "../schedule/ClientPicker";
import { VideoBank } from "./VideoBank";

// Most-used first: filmed and waiting for a date, then what's on a shoot, then ideas.
const TABS = ["ready", "shoot", "ideas", "dropped"] as const;
type Tab = (typeof TABS)[number];

const shot = (v: Task) => v.shot_status === "shot" || (v.phase ?? 0) >= 2;

/** Which shelf of the bank a video sits on; null once it has a posting date (it's work then). */
function shelf(v: Task): Tab | null {
  if (v.dropped_at) return "dropped";
  if (v.publish_date || (v.phase ?? 0) >= 5) return null;
  if (shot(v)) return "ready";
  return v.shoot_id ? "shoot" : "ideas";
}

// Video bank: every video of a client that isn't work yet. URL: ?client=<id>&tab=ideas|shoot|ready|dropped
export default async function VideoBankPage({ searchParams }: PageProps<"/content/videos">) {
  const [params, lookups, t, remembered] = await Promise.all([searchParams, getLookups(), getTranslations(), rememberedClient()]);
  const today = getToday();
  const clients = lookups.clients;
  const client =
    clients.find((c) => c.id === params.client) ??
    clients.find((c) => c.id === remembered) ??
    clients.find((c) => c.status === "active") ??
    clients[0];
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "ready";

  if (!client) {
    return (
      <>
        <PageHeader title={t("bank.title")} newTask={false} />
        <p className="px-5 text-[15px] text-ink3 lg:px-10">{t("schedule.noClient")}</p>
      </>
    );
  }

  // The dropped shelf can be long (NoLimit: ~350), so it's loaded only when open; otherwise just counted.
  const [videos, dropped, droppedCount, shoots] = await Promise.all([
    getClientVideos(client.id, { bank: true }),
    tab === "dropped" ? getClientVideos(client.id, { dropped: true }) : Promise.resolve([]),
    countDropped(client.id),
    getShootDays(),
  ]);
  const groups = Object.fromEntries(TABS.map((k) => [k, [] as Task[]])) as Record<Tab, Task[]>;
  for (const v of [...videos, ...dropped]) {
    const s = shelf(v);
    if (s) groups[s].push(v);
  }
  const counts = { ...Object.fromEntries(TABS.map((k) => [k, groups[k].length])), dropped: droppedCount } as Record<Tab, number>;
  groups.ideas.sort((a, b) => b.created_at.localeCompare(a.created_at));
  groups.shoot.sort((a, b) => (b.shoot?.date ?? "").localeCompare(a.shoot?.date ?? ""));
  groups.ready.sort((a, b) => (b.shoot?.date ?? "").localeCompare(a.shoot?.date ?? ""));
  groups.dropped.sort((a, b) => (b.dropped_at ?? "").localeCompare(a.dropped_at ?? ""));

  const upcoming = shoots
    .filter((s) => s.client?.id === client.id && s.date >= today)
    .map((s) => ({ id: s.id, date: s.date, location: s.location }));

  const tabs = TABS.map((k) => ({
    key: k,
    label: `${t(`bank.tab.${k}`)} · ${counts[k]}`,
    href: `/content/videos?client=${client.id}${k === "ready" ? "" : `&tab=${k}`}`,
    active: k === tab,
  }));

  return (
    <>
      <PageHeader
        title={t("bank.title")}
        newTask={false}
        actions={
          <Link href={`?new=1&kind=video&client=${client.id}${tab === "ready" ? "" : `&tab=${tab}`}`} scroll={false} className={buttonClass({ size: "sm" })}>
            {t("bank.new")}
          </Link>
        }
      />
      <div className="flex flex-col gap-3 border-b border-line px-5 pb-[18px] lg:px-10">
        <p className="max-w-[640px] text-[14px] text-ink3">{t("bank.intro")}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <Suspense>
            <ClientPicker clients={clients.map((c) => ({ id: c.id, name: c.name }))} value={client.id} />
          </Suspense>
          <div className="no-scrollbar max-w-full overflow-x-auto">
            <Segmented items={tabs} />
          </div>
        </div>
      </div>
      <VideoBank key={`${client.id}-${tab}`} tab={tab} videos={groups[tab]} shoots={upcoming} today={today} />
    </>
  );
}
