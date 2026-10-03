import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate, weekdayIndex } from "@/lib/dates";
import { getPortal, getPortalShoots, getPortalVideos } from "@/lib/portal";
import { ScriptApprovals } from "./ScriptApprovals";

// 7g (desktop) / 7h (mobile): every script of a shoot day; approve one by one or all at once.
export default async function PortalShoot({ params }: PageProps<"/p/[token]/shoots/[shootId]">) {
  const { token, shootId } = await params;
  const portal = (await getPortal(token))!;
  const shoot = (await getPortalShoots(portal.clientId)).find((s) => s.id === shootId);
  if (!shoot || (!portal.show.shoots && !portal.show.scripts)) notFound();
  const [videos, t] = await Promise.all([getPortalVideos(portal.clientId, { shootId }), getTranslations()]);
  const list = videos
    .filter((v) => v.shoot?.id === shootId)
    .sort((a, b) => (a.shoot_time ?? "").localeCompare(b.shoot_time ?? ""));

  return (
    <div className="flex flex-col gap-6 px-5 pb-12 pt-6 lg:px-12 lg:pt-10">
      <div className="flex flex-col gap-3">
        <Link href={`/p/${token}/shoots`} className="text-[15px] font-medium text-ink2 hover:text-ink">‹ {t("portal.shootsTitle")}</Link>
        <span className="text-[14px] font-medium text-ink2">
          {t("weekday.long", { day: String(weekdayIndex(shoot.date)) })}, {formatDate(shoot.date)}
          {shoot.location ? ` · ${shoot.location}` : ""}
        </span>
        <h1 className="display text-[30px] lg:text-[40px]">{t("portal.scriptsTitle")}</h1>
      </div>
      {list.length ? (
        <ScriptApprovals
          token={token}
          shootId={shootId}
          canDecide={portal.show.scripts}
          videos={list.map((v) => ({
            id: v.id,
            title: v.title,
            time: v.shoot_time,
            onCamera: v.on_camera,
            type: v.content_type,
            script: v.script,
            decision: v.scriptDecision,
          }))}
        />
      ) : (
        <p className="text-[15px] text-ink3">{t("portal.noScripts")}</p>
      )}
    </div>
  );
}
