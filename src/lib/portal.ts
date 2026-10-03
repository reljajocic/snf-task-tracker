import "server-only";
import { cache } from "react";
import type { IsoDate } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/server";
import type { ScriptSection } from "@/lib/tasks";

// Everything the client portal shows is loaded here with the service role, always scoped to
// the one client the secret token belongs to. Only client-safe fields are selected: no
// assignees, internal tasks, comments, notes or descriptions.

export type Portal = {
  clientId: string;
  clientName: string;
  token: string;
  show: { schedule: boolean; shoots: boolean; scripts: boolean; review: boolean; report: boolean };
};

export const getPortal = cache(async (token: string): Promise<Portal | null> => {
  if (!/^[0-9a-f]{32,64}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("client_portals")
    .select("client_id, token, enabled, show_schedule, show_shoots, show_scripts, show_review, show_report, client:clients(name)")
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

/** What the client sees for a video: published / waiting for you / ready / in preparation. */
export type PortalStatus = "published" | "awaiting" | "ready" | "preparing";

export function portalStatus(v: PortalVideo): PortalStatus {
  if (v.phase >= 5) return "published";
  const latest = v.versions[0];
  if (latest && !latest.decision) return "awaiting";
  if (latest?.decision?.status === "approved" || v.shot_status === "shot" || v.phase >= 2) return "ready";
  return "preparing";
}

export const PORTAL_STATUS_COLOR: Record<PortalStatus, string> = {
  published: "var(--status-done)",
  awaiting: "var(--accent)",
  ready: "var(--status-in-progress)",
  preparing: "var(--status-todo)",
};

type RawVideo = Omit<PortalVideo, "versions" | "scriptDecision"> & {
  video_versions: Omit<PortalVideo["versions"][number], "decision">[];
  approvals: (Decision & { kind: string; version_id: string | null })[];
};

export const getPortalVideos = cache(async (clientId: string): Promise<PortalVideo[]> => {
  const { data, error } = await createAdminClient()
    .from("tasks")
    .select(
      `id, title, content_type, on_camera, location, script, publish_date, phase, shot_status, shoot_time,
       shoot:shoot_days(id, date, location),
       video_versions(id, version, url, note, created_at),
       approvals(id, kind, version_id, status, approver_name, comment, created_at)`,
    )
    .eq("client_id", clientId)
    .eq("kind", "video")
    .order("publish_date", { nullsFirst: false })
    .returns<RawVideo[]>();
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
});

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
