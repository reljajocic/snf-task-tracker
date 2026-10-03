import "server-only";
import { cache } from "react";
import { requireProfile, requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT, toTask, type Person, type RawTask, type Task } from "@/lib/tasks";

/** Every task the signed-in user may see (RLS decides), open ones first by deadline. */
export const getTasks = cache(async (opts: { includeDone?: boolean } = {}): Promise<Task[]> => {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(TASK_SELECT).order("due_date", { nullsFirst: false });
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
  postingDays: number[];
  projects: { id: string; name: string; isMember: boolean }[];
};

export type Lookups = { me: { id: string; isAdmin: boolean }; people: Person[]; clients: ClientOption[] };

/** Options for task forms: people to assign, clients and projects the user can file under. */
export const getLookups = cache(async (): Promise<Lookups> => {
  // Everything in one parallel batch: the profile query runs alongside the rest.
  const userId = await requireUserId();
  const supabase = await createClient();

  const [profile, people, clients, projects, memberships, projectMemberships] = await Promise.all([
    requireProfile(),
    supabase
      .from("profiles")
      .select("id, full_name, initials, avatar_bg, avatar_fg")
      .eq("is_active", true)
      .order("full_name")
      .returns<Person[]>(),
    supabase.from("clients").select("id, name, status, content_types, locations, posting_days, default_editor_id").order("name"),
    supabase.from("projects").select("id, name, client_id, status").neq("status", "archived").order("name"),
    supabase.from("client_members").select("client_id, role").eq("user_id", userId),
    supabase.from("project_members").select("project_id").eq("user_id", userId),
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
        postingDays: c.posting_days ?? [0, 2, 4],
        projects: (projects.data ?? [])
          .filter((p) => p.client_id === c.id)
          .map((p) => ({ id: p.id, name: p.name, isMember: memberOf.has(p.id) })),
      };
    }),
  };
});
