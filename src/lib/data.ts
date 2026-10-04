import "server-only";
import { cache } from "react";
import { requireProfile, requireUserId } from "@/lib/auth";
import { addDays, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT, toTask, type Person, type RawTask, type Task } from "@/lib/tasks";

/**
 * Work the signed-in user may see (RLS decides), open ones first by deadline. A video only
 * becomes work once it has a posting date (that's when it goes to edit); until then it lives in
 * the video bank. Published videos drop out of the work views after a month.
 */
export const getTasks = cache(async (opts: { includeDone?: boolean } = {}): Promise<Task[]> => {
  const supabase = await createClient();
  const recent = addDays(today(), -30);
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`kind.neq.video,and(publish_date.not.is.null,or(status.neq.done,publish_date.gte.${recent}))`)
    .order("due_date", { nullsFirst: false });
  if (!opts.includeDone) query = query.neq("status", "done");
  const { data, error } = await query.returns<RawTask[]>();
  if (error) throw error;
  return (data ?? []).map(toTask);
});

export type ClientOption = {
  id: string;
  name: string;
  status: string;
  /** Admin, or manager of this client: may file tasks without a project, create projects. */
  canManage: boolean;
  /** On the client's team (any role) or admin: may create and edit all of the client's work. */
  isTeam: boolean;
  defaultEditorId: string | null;
  contentTypes: string[];
  locations: string[];
  /** Social profiles with their own posting schedule (empty: just one). */
  profiles: string[];
  postingDays: number[];
  /** Who is on the client's team (user ids): the people work can be assigned to. */
  team: string[];
  projects: { id: string; name: string; isMember: boolean }[];
};

export type Lookups = { me: { id: string; isAdmin: boolean }; people: Person[]; clients: ClientOption[] };

/** Options for task forms: people to assign, clients and projects the user can file under. */
export const getLookups = cache(async (): Promise<Lookups> => {
  // Everything in one parallel batch: the profile query runs alongside the rest.
  const userId = await requireUserId();
  const supabase = await createClient();

  const [profile, people, clients, projects, memberships, projectMemberships, teams] = await Promise.all([
    requireProfile(),
    // The admin account oversees everything but never does the work: it's left out of every
    // people picker (assignees, crew, editors, teams, filters). The Team page lists it separately.
    supabase
      .from("profiles")
      .select("id, full_name, initials, avatar_bg, avatar_fg")
      .eq("is_active", true)
      .neq("role", "admin")
      .order("full_name")
      .returns<Person[]>(),
    supabase.from("clients").select("id, name, status, content_types, locations, profiles, posting_days, default_editor_id").order("name"),
    supabase.from("projects").select("id, name, client_id, status").neq("status", "archived").order("name"),
    supabase.from("client_members").select("client_id, role").eq("user_id", userId),
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("client_members").select("client_id, user_id"),
  ]);
  const isAdmin = profile.role === "admin";

  const teamOf = new Set((memberships.data ?? []).map((m) => m.client_id));
  const managerOf = new Set(
    (memberships.data ?? []).filter((m) => m.role === "manager").map((m) => m.client_id),
  );
  const memberOf = new Set((projectMemberships.data ?? []).map((m) => m.project_id));

  return {
    me: { id: profile.id, isAdmin },
    people: people.data ?? [],
    clients: (clients.data ?? []).map((c) => {
      const canManage = isAdmin || managerOf.has(c.id);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        canManage,
        isTeam: isAdmin || teamOf.has(c.id),
        defaultEditorId: c.default_editor_id ?? null,
        contentTypes: c.content_types ?? [],
        locations: c.locations ?? [],
        profiles: c.profiles ?? [],
        postingDays: c.posting_days ?? [0, 2, 4],
        team: (teams.data ?? []).filter((m) => m.client_id === c.id).map((m) => m.user_id),
        projects: (projects.data ?? [])
          .filter((p) => p.client_id === c.id)
          .map((p) => ({ id: p.id, name: p.name, isMember: memberOf.has(p.id) })),
      };
    }),
  };
});
