import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { embedUrl } from "@/lib/embed";
import { formatDate, weekdayIndex } from "@/lib/dates";
import { canUndo, getPortal, getPortalVideos, portalStatus, PORTAL_STATUS_COLOR } from "@/lib/portal";
import { Poster } from "../../bits";
import { VideoDecision } from "./VideoDecision";

// 7c (desktop) / 7f (mobile): watch a cut and approve it or ask for changes.
export default async function PortalVideo({ params, searchParams }: PageProps<"/p/[token]/video/[taskId]">) {
  const [{ token, taskId }, { v: versionParam }] = await Promise.all([params, searchParams]);
  const portal = (await getPortal(token))!;
  const t = await getTranslations({ locale: portal.locale });
  if (!portal.show.review) notFound();
  const video = (await getPortalVideos(portal.clientId, { id: taskId }))[0];
  if (!video || !video.versions.length) notFound();

  const shown = video.versions.find((x) => String(x.version) === versionParam) ?? video.versions[0];
  const isLatest = shown.id === video.versions[0].id;
  const player = embedUrl(shown.url);
  const status = portalStatus(video);
  const facts = [
    video.publish_date && t("portal.postOn", { date: `${t("weekday.short", { day: String(weekdayIndex(video.publish_date)) })}, ${formatDate(video.publish_date)}` }),
    video.on_camera,
    video.location,
    video.content_type,
  ].filter(Boolean);

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[560px_minmax(0,1fr)]">
      <div className="flex flex-col items-center justify-center gap-3.5 border-line bg-side px-5 py-6 lg:border-r lg:py-10">
        <Link href={`/p/${token}`} className="self-start text-[15px] font-medium text-ink2 lg:hidden">
          {t("portal.back")}
        </Link>
        <div className="relative aspect-[9/16] w-full max-w-[400px] overflow-hidden rounded-[10px] bg-ink-black">
          {player ? (
            <iframe src={player} title={video.title} allow="autoplay; fullscreen" allowFullScreen className="absolute inset-0 size-full border-0" />
          ) : (
            <a href={shown.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Poster className="size-[76px] rounded-full text-[24px]" />
              <span className="text-[14px] font-medium text-offwhite">{t("portal.openVideo")}</span>
            </a>
          )}
        </div>
        <div className="flex w-full max-w-[400px] flex-wrap justify-between gap-2 text-[13px] font-medium text-ink3">
          <span>{t("portal.version", { n: shown.version, date: formatDate(shown.created_at.slice(0, 10)) })}</span>
          <span className="flex gap-3">
            {video.versions
              .filter((x) => x.id !== shown.id)
              .map((x) => (
                <Link key={x.id} href={`?v=${x.version}`} className="text-ink2 hover:text-ink">
                  {t("portal.version", { n: x.version, date: "" }).replace(" · ", "")}
                </Link>
              ))}
          </span>
        </div>
      </div>

      <div className="flex max-w-[720px] flex-col gap-7 px-5 pb-12 pt-6 lg:px-14 lg:py-10">
        <Link href={`/p/${token}`} className="hidden text-[15px] font-medium text-ink2 hover:text-ink lg:block">
          {t("portal.back")}
        </Link>
        <div className="flex flex-col gap-3.5">
          <span className="flex items-center gap-2 self-start rounded-full border border-line2 px-3 py-[7px] text-[13px] font-medium">
            <span className="size-2 rounded-full" style={{ background: PORTAL_STATUS_COLOR[status] }} />
            {t(`portal.status.${status}`)}
          </span>
          <h1 className="display text-[30px] leading-[0.98] lg:text-[40px]">{video.title}</h1>
          {facts.length > 0 && <span className="text-[15px] leading-normal text-ink2">{facts.join(" · ")}</span>}
        </div>

        {video.script.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border border-line px-[22px] py-5">
            <span className="eyebrow">{t("portal.script")}</span>
            {video.script.map((s, i) => (
              <span key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">
                <span className="font-semibold text-accent">{s.label}</span> {s.text}
              </span>
            ))}
          </div>
        )}

        {shown.note && (
          <div className="flex gap-3">
            <span className="grid size-8 flex-none place-items-center rounded-full bg-[#F4A98D] text-[13px] font-semibold text-charcoal">S</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold">
                Slate &apos;n&apos; Frame <span className="font-normal text-ink3">· {formatDate(shown.created_at.slice(0, 10))}</span>
              </span>
              <span className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">{shown.note}</span>
            </div>
          </div>
        )}

        {isLatest && <VideoDecision token={token} taskId={video.id} versionId={shown.id} decision={shown.decision} undoable={canUndo(shown.decision)} />}
      </div>
    </div>
  );
}
