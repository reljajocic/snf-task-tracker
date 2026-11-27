import "server-only";
import { reportError } from "@/lib/errors";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Moodboards: one Excalidraw scene per project, and one general board per client. The team reads and writes through RLS (and live
// over Realtime); the client portal goes through server actions that check the portal token.

export type BoardAccess = "none" | "view" | "edit";
export type BoardFiles = Record<string, { url: string; mimeType: string }>;
export type BoardData = {
  id: string;
  /** Null on the client's own board. */
  projectId: string | null;
  projectName: string | null;
  clientId: string;
  clientName: string;
  elements: unknown[];
  files: BoardFiles;
  clientAccess: BoardAccess;
};

type Row = {
  id: string;
  project_id: string | null;
  elements: unknown;
  files: unknown;
  client_access: string;
  project: { name: string; client: { id: string; name: string } | null } | null;
  owner: { id: string; name: string } | null;
};
const COLS =
  "id, project_id, elements, files, client_access, project:projects(name, client:clients(id, name)), owner:clients!boards_client_id_fkey(id, name)";

const toBoard = (r: Row): BoardData => ({
  id: r.id,
  projectId: r.project_id,
  projectName: r.project?.name ?? null,
  clientId: r.owner?.id ?? r.project?.client?.id ?? "",
  clientName: r.owner?.name ?? r.project?.client?.name ?? "",
  elements: Array.isArray(r.elements) ? r.elements : [],
  files: r.files && typeof r.files === "object" ? (r.files as BoardFiles) : {},
  clientAccess: r.client_access === "view" || r.client_access === "edit" ? r.client_access : "none",
});

/** A board for a team member, made on first open. Null when they can't use it. */
async function getOrMakeBoard(owner: "project_id" | "client_id", id: string, path: string): Promise<BoardData | null> {
  const supabase = await createClient();
  const first = await supabase.from("boards").select(COLS).eq(owner, id).maybeSingle<Row>();
  if (first.data) return toBoard(first.data);
  // Make it unless it exists (two requests at once, e.g. a prefetch and the click, both land here).
  const made = await supabase.from("boards").upsert(owner === "project_id" ? { project_id: id } : { client_id: id }, { onConflict: owner, ignoreDuplicates: true });
  const again = await supabase.from("boards").select(COLS).eq(owner, id).maybeSingle<Row>();
  if (again.data) return toBoard(again.data);
  // Shouldn't happen for someone who can open it: leave a trace to find out why.
  await reportError({
    source: "server",
    message: `Moodboard not opened: ${[first.error?.message, made.error?.message, again.error?.message].filter(Boolean).join(" | ") || "no row after create"}`,
    path,
  });
  return null;
}

/** The project's board (its client's team and the project's members). */
export const getProjectBoard = (projectId: string) => getOrMakeBoard("project_id", projectId, `/projects/${projectId}/board`);

/** The client's own board, for brand, style and references (the client's team). */
export const getClientBoard = (clientId: string) => getOrMakeBoard("client_id", clientId, `/clients/${clientId}/board`);

/** Boards of this client the portal may show (the board lets the client see or edit): the client's own first, then projects'. */
export async function getPortalBoards(clientId: string): Promise<{ id: string; projectName: string | null; access: BoardAccess }[]> {
  const admin = createAdminClient();
  const [own, projects] = await Promise.all([
    admin.from("boards").select("id, client_access").eq("client_id", clientId).neq("client_access", "none").returns<{ id: string; client_access: BoardAccess }[]>(),
    admin
      .from("boards")
      .select("id, client_access, project:projects!inner(name, client_id)")
      .eq("project.client_id", clientId)
      .neq("client_access", "none")
      .returns<{ id: string; client_access: BoardAccess; project: { name: string } }[]>(),
  ]);
  return [
    ...(own.data ?? []).map((b) => ({ id: b.id, projectName: null, access: b.client_access })),
    ...(projects.data ?? []).map((b) => ({ id: b.id, projectName: b.project.name, access: b.client_access })).sort((a, b) => a.projectName.localeCompare(b.projectName)),
  ];
}

/** One board for the portal, only if it belongs to the client and is shared with them. */
export async function getPortalBoard(clientId: string, boardId: string): Promise<BoardData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(boardId)) return null;
  const { data } = await createAdminClient().from("boards").select(COLS).eq("id", boardId).maybeSingle<Row>();
  if (!data) return null;
  const board = toBoard(data);
  return board.clientId === clientId && board.clientAccess !== "none" ? board : null;
}
