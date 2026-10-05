import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { IsoDate } from "@/lib/dates";
import { parseLocale, type Locale } from "@/lib/locale";
import { createAdminClient } from "@/lib/supabase/server";
import type { ScriptSection } from "@/lib/tasks";

// Everything the client portal shows is loaded here with the service role, always scoped to
// the one client the secret token belongs to. Only client-safe fields are selected: no
// assignees, internal tasks, comments, notes or descriptions.

export const PORTAL_LANG_COOKIE = "snf-portal-lang";

export type Portal = {
  clientId: string;
  clientName: string;
  token: string;
  show: { schedule: boolean; shoots: boolean; scripts: boolean; review: boolean; report: boolean };
  locale: Locale;
};

export const getPortal = cache(async (token: string): Promise<Portal | null> => {
  if (!/^[0-9a-f]{32,64}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("client_portals")
    .select("client_id, token, enabled, locale, show_schedule, show_shoots, show_scripts, show_review, show_report, client:clients(name)")
    .eq("token", token)
    .eq("enabled", true)
    .maybeSingle<{
      client_id: string;
      token: string;
      show_schedule: boolean;
      show_shoots: boolean;
      show_scripts: boolean;
      show_review: boolean;
      show_report: boolean;
      locale: string;
      client: { name: string } | null;
    }>();
  if (!data) return null;
  return {
    clientId: data.client_id,
    clientName: data.client?.name ?? "",
    token: data.token,
    show: {
      schedule: data.show_schedule,
      shoots: data.show_shoots,
      scripts: data.show_scripts,
      review: data.show_review,
      report: data.show_report,
    },
    // A visitor's own pick (the SR/EN switch in the portal header) wins over the client's default.
    locale: parseLocale((await cookies()).get(PORTAL_LANG_COOKIE)?.value ?? data.locale),
  };
});

export type Decision = { id: string; status: "approved" | "changes"; approver_name: string; comment: string | null; created_at: string };

export type PortalVideo = {
  id: string;
  title: string;
  content_type: string | null;
  on_camera: string | null;
  location: string | null;
  script: ScriptSection[];
  publish_date: IsoDate | null;
  phase: number;
  shot_status: string | null;
  shoot: { id: string; date: IsoDate; location: string | null } | null;
  shoot_time: string | null;
  versions: { id: string; version: number; url: string; note: string | null; created_at: string; decision: Decision | null }[];
  scriptDecision: Decision | null;
};

import type { PortalStatus } from "@/lib/portal-status";
export { PORTAL_STATUS_COLOR, type PortalStatus } from "@/lib/portal-status";

export function portalStatus(v: PortalVideo): PortalStatus {
  if (v.phase >= 5) return "published";
  const latest = v.versions[0];
  if (latest && !latest.decision) return "awaiting";
  if (latest?.decision?.status === "approved" || v.shot_status === "shot" || v.phase >= 2) return "ready";
  return "preparing";
}



type RawVideo = Omit<PortalVideo, "versions" | "scriptDecision"> & {
  video_versions: Omit<PortalVideo["versions"][number], "decision">[];
  approvals: (Decision & { kind: string; version_id: string | null })[];
};

/**
 * Which of the client's videos a portal page needs (a client's history can be ~1 MB):
 *  - id: one video · shootId: one shoot day · from: posting on/after a date
 *  - month: published that month (YYYY-MM) · open: not published yet, or posting from a date on
 * Dropped videos never reach the portal.
 */
export type PortalScope = { id: string } | { shootId: string } | { from: IsoDate } | { month: string } | { open: IsoDate };

export async function getPortalVideos(clientId: string, scope: PortalScope): Promise<PortalVideo[]> {
  let query = createAdminClient()
    .from("tasks")
    .select(
      `id, title, content_type, on_camera, location, script, publish_date, phase, shot_status, shoot_time,
       shoot:shoot_days(id, date, location),
       video_versions(id, version, url, note, created_at),
       approvals(id, kind, version_id, status, approver_name, comment, created_at)`,
    )
    .eq("client_id", clientId)
    .eq("kind", "video")
    .is("dropped_at", null);
  if ("id" in scope) query = query.eq("id", scope.id);
  else if ("shootId" in scope) query = query.eq("shoot_id", scope.shootId);
  else if ("from" in scope) query = query.gte("publish_date", scope.from);
  else if ("month" in scope) query = query.gte("publish_date", `${scope.month}-01`).lte("publish_date", `${scope.month}-31`).gte("phase", 5);
  else query = query.or(`phase.lt.5,publish_date.gte.${scope.open}`);
  const { data, error } = await query.order("publish_date", { nullsFirst: false }).returns<RawVideo[]>();
  if (error) throw error;
  return (data ?? []).map(({ video_versions, approvals, ...v }) => {
    const byNewest = [...approvals].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const pick = ({ id, status, approver_name, comment, created_at }: Decision) => ({ id, status, approver_name, comment, created_at });
    const scriptDecision = byNewest.find((a) => a.kind === "script");
    return {
      ...v,
      phase: v.phase ?? 0,
      script: Array.isArray(v.script) ? v.script.filter((s) => s.text?.trim()) : [],
      versions: [...video_versions]
        .sort((a, b) => b.version - a.version)
        .map((ver) => {
          const d = byNewest.find((a) => a.kind === "video" && a.version_id === ver.id);
          return { ...ver, decision: d ? pick(d) : null };
        }),
      scriptDecision: scriptDecision ? pick(scriptDecision) : null,
    };
  });
}

/** Script approval progress per shoot day (a light query: no scripts or versions). */
export async function getPortalScriptProgress(clientId: string) {
  const { data } = await createAdminClient()
    .from("tasks")
    .select("shoot_id, approvals(kind, status, created_at)")
    .eq("client_id", clientId)
    .eq("kind", "video")
    .is("dropped_at", null)
    .not("shoot_id", "is", null)
    .returns<{ shoot_id: string; approvals: { kind: string; status: string; created_at: string }[] }[]>();
  const out = new Map<string, { total: number; approved: number; changes: number }>();
  for (const v of data ?? []) {
    const p = out.get(v.shoot_id) ?? { total: 0, approved: 0, changes: 0 };
    const latest = v.approvals.filter((a) => a.kind === "script").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    p.total++;
    if (latest?.status === "approved") p.approved++;
    if (latest?.status === "changes") p.changes++;
    out.set(v.shoot_id, p);
  }
  return out;
}

export type PortalShoot = { id: string; date: IsoDate; location: string | null; starts_at: string | null; ends_at: string | null };

export const getPortalShoots = cache(async (clientId: string): Promise<PortalShoot[]> => {
  const { data } = await createAdminClient()
    .from("shoot_days")
    .select("id, date, location, starts_at, ends_at")
    .eq("client_id", clientId)
    .order("date");
  return (data ?? []).map((s) => ({ ...s, starts_at: s.starts_at?.slice(0, 5) ?? null, ends_at: s.ends_at?.slice(0, 5) ?? null }));
});

/** Decisions can be undone for 15 minutes (design: "Poništi"). */
export const UNDO_WINDOW_MS = 15 * 60_000;
export function canUndo(d: Decision | null, now: number = Date.now()) {
  return d !== null && now - new Date(d.created_at).getTime() < UNDO_WINDOW_MS;
}
