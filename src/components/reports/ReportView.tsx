import { formatDate } from "@/lib/dates";
import type { MonthReport } from "@/lib/report";
import { safeHref } from "@/lib/safe-url";
import { PostTags } from "@/components/tasks/tags";
import { parseFormat, type PostFormat } from "@/lib/formats";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * A month's report as the client sees it in the portal (and the team sees it before publishing):
 * the team's word, the month in numbers, the work behind it, and every post with its link.
 */
export function ReportView({ report, summary, t, formatLabel }: { report: MonthReport; summary: string | null; t: T; formatLabel: (f: PostFormat) => string }) {
  const stat = (value: React.ReactNode, label: string, sub?: string) => (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surf px-4 py-3.5">
      <span className="display text-[34px] leading-none">{value}</span>
      <span className="text-[14px] text-ink2">{label}</span>
      {sub && <span className="text-[12px] text-ink3">{sub}</span>}
    </div>
  );
  const bars = (title: string, rows: { label: string; n: number }[]) => {
    const max = Math.max(1, ...rows.map((r) => r.n));
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surf p-4">
        <h3 className="eyebrow">{title}</h3>
        {rows.length ? (
          rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_32px] items-center gap-3 text-[14px]">
              <span className="truncate text-ink2">{r.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-chip">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums">{r.n}</span>
            </div>
          ))
        ) : (
          <span className="text-[14px] text-ink3">—</span>
        )}
      </section>
    );
  };
  const w = report.work;
  const n = (x: number | null) => (x === null ? "—" : x.toLocaleString("sr-RS"));
  const social = report.social;

  return (
    <div className="flex flex-col gap-7">
      {summary && (
        <section className="flex gap-3 rounded-lg border border-line bg-surf p-5">
          <span className="grid size-8 flex-none place-items-center rounded-full bg-[#F4A98D] text-[13px] font-semibold text-charcoal">S</span>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{summary}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{t("inNumbers")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {stat(report.published, t("published"), t("ofPlanned", { n: report.planned }))}
          {stat(report.onTime, t("onTime"), report.published ? t("percent", { n: Math.round((report.onTime / report.published) * 100) }) : undefined)}
          {stat(w.shootDays, t("shootDays"), t("videosShot", { n: w.shot }))}
          {stat(w.cutsSent, t("cutsSent"))}
          {stat(w.approved, t("approved"), w.avgApprovalDays !== null ? t("avgApproval", { n: w.avgApprovalDays }) : undefined)}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {bars(t("byFormat"), report.byFormat.map((r) => ({ label: formatLabel(parseFormat(r.label)), n: r.n })))}
          {bars(t("byType"), report.byType)}
          {bars(t("byProfile"), report.byProfile)}
        </div>
      </section>

      {social && (
        <section className="flex flex-col gap-3">
          <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{t("onInstagram")}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {stat(n(social.totals.views), t("views"), t("acrossPosts", { n: social.posts }))}
            {stat(n(social.totals.reach), t("reach"))}
            {stat(n(social.totals.likes), t("likes"))}
            {stat(n(social.totals.comments), t("comments"))}
            {stat(n(social.totals.saved), t("saved"))}
            {stat(n(social.totals.shares), t("shares"))}
            {social.followersEnd !== null &&
              stat(
                n(social.followersEnd),
                t("followers"),
                social.followersStart !== null ? t("followersChange", { n: `${social.followersEnd - social.followersStart >= 0 ? "+" : ""}${(social.followersEnd - social.followersStart).toLocaleString("sr-RS")}` }) : undefined,
              )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="display text-[18px] leading-[1.1] lg:text-[20px]">{t("posts")}</h2>
        {report.posts.length ? (
          <div className="snf-stack">
            {report.posts.map((p) => {
              const href = safeHref(p.url);
              return (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-[18px] py-3 last:border-b-0 md:grid-cols-[100px_minmax(0,1fr)_200px_auto]">
                  <span className="hidden text-[14px] tabular-nums text-ink3 md:block">{formatDate(p.date)}</span>
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="truncate text-[15px] font-medium">{p.title}</span>
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink3">
                      <span className="md:hidden">{formatDate(p.date)}</span>
                      <PostTags format={parseFormat(p.format)} type={p.type} formatLabel={formatLabel(parseFormat(p.format))} />
                    </span>
                    {p.metrics && (
                      <span className="truncate text-[13px] font-medium text-ink2">
                        {[
                          p.metrics.views !== null && t("nViews", { n: n(p.metrics.views) }),
                          p.metrics.likes !== null && t("nLikes", { n: n(p.metrics.likes) }),
                          p.metrics.comments !== null && t("nComments", { n: n(p.metrics.comments) }),
                          p.metrics.saved ? t("nSaved", { n: n(p.metrics.saved) }) : null,
                          p.metrics.shares ? t("nShares", { n: n(p.metrics.shares) }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="hidden truncate text-[13px] text-ink2 md:block">{p.profile ?? ""}</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="justify-self-end text-[14px] font-medium text-rust-ink hover:underline">
                      {t("viewPost")} ↗
                    </a>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line2 px-4 py-6 text-[14px] text-ink3">{t("noPosts")}</p>
        )}
      </section>
    </div>
  );
}
