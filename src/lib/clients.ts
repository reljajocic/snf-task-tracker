import { parseEditorRules, type EditorRule } from "@/lib/editor-rules";
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus } from "@/lib/client-status";
import { parseSocials, type Social } from "@/lib/socials";

export { CLIENT_STATUSES, CLIENT_STATUS_COLOR, PROJECT_STATUS_COLOR, clientInitials, type ClientStatus } from "@/lib/client-status";

export type Client = {
  id: string;
  name: string;
  status: ClientStatus;
  services: string[];
  city: string | null;
  since: string | null;
  email: string | null;
  socials: Social[];
  locations: string[];
  profiles: string[];
  color: string | null;
  initials: string | null;
  drive_url: string | null;
  notes: string | null;
  content_types: string[];
  posting_days: number[];
  default_editor_id: string | null;
  editor_rules: EditorRule[];
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  status: "active" | "on_hold" | "completed" | "archived";
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  drive_url: string | null;
  members: string[];
};

const CLIENT_COLS = "id, name, status, services, city, since, email, socials, locations, profiles, color, initials, drive_url, notes, content_types, posting_days, default_editor_id, editor_rules";

/** Clients the user can see (RLS), sorted by name. */
export const getClients = cache(async (): Promise<Client[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select(CLIENT_COLS).order("name").returns<Client[]>();
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, socials: parseSocials(c.socials), editor_rules: parseEditorRules(c.editor_rules) }));
});

export async function getClient(id: string) {
  const supabase = await createClient();
  const [client, projects, members] = await Promise.all([
    supabase.from("clients").select(CLIENT_COLS).eq("id", id).maybeSingle<Client>(),
    supabase
      .from("projects")
      .select("id, client_id, name, status, description, starts_on, ends_on, drive_url, project_members(user_id)")
      .eq("client_id", id)
      .order("created_at"),
    supabase
      .from("client_members")
      .select("role, profile:profiles(id, full_name, initials, avatar_bg, avatar_fg, avatar_url)")
      .eq("client_id", id),
  ]);
  if (!client.data) return null;
  type RawProject = Omit<Project, "members"> & { project_members: { user_id: string }[] };
  return {
    client: { ...client.data, socials: parseSocials(client.data.socials), editor_rules: parseEditorRules(client.data.editor_rules) },
    projects: ((projects.data ?? []) as RawProject[]).map(({ project_members, ...p }) => ({
      ...p,
      members: project_members.map((m) => m.user_id),
    })),
    members: (members.data ?? []) as unknown as {
      role: "manager" | "member";
      profile: { id: string; full_name: string; initials: string; avatar_bg: string; avatar_fg: string; avatar_url?: string | null };
    }[],
  };
}

