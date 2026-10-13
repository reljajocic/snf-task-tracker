import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Moodboards: one Excalidraw scene per project. The team reads and writes through RLS (and live
// over Realtime); the client portal goes through server actions that check the portal token.

export type BoardAccess = "none" | "view" | "edit";
export type BoardFiles = Record<string, { url: string; mimeType: string }>;
export type BoardData = {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  elements: unknown[];
  files: BoardFiles;
  clientAccess: BoardAccess;
};

type Row = {
  id: string;
  project_id: string;
  elements: unknown;
  files: unknown;
  client_access: string;
  project: { name: string; client: { id: string; name: string } | null } | null;
};
const COLS = "id, project_id, elements, files, client_access, project:projects(name, client:clients(id, name))";

const toBoard = (r: Row): BoardData => ({
  id: r.id,
  projectId: r.project_id,
  projectName: r.project?.name ?? "",
  clientId: r.project?.client?.id ?? "",
  clientName: r.project?.client?.name ?? "",
  elements: Array.isArray(r.elements) ? r.elements : [],
  files: r.files && typeof r.files === "object" ? (r.files as BoardFiles) : {},
  clientAccess: r.client_access === "view" || r.client_access === "edit" ? r.client_access : "none",
});

/** The project's board for a team member, made on first open. Null when they can't use it. */
export async function getProjectBoard(projectId: string): Promise<BoardData | null> {
  const supabase = await createClient();
  const first = await supabase.from("boards").select(COLS).eq("project_id", projectId).maybeSingle<Row>();
  if (first.data) return toBoard(first.data);
  // Make it unless it exists (two requests at once, e.g. a prefetch and the click, both land here).
  await supabase.from("boards").upsert({ project_id: projectId }, { onConflict: "project_id", ignoreDuplicates: true });
  const again = await supabase.from("boards").select(COLS).eq("project_id", projectId).maybeSingle<Row>();
  return again.data ? toBoard(again.data) : null;
}

/** Boards of this client the portal may show (the board lets the client see or edit). */
export async function getPortalBoards(clientId: string): Promise<{ id: string; projectName: string; access: BoardAccess }[]> {
  const { data } = await createAdminClient()
    .from("boards")
    .select("id, client_access, project:projects!inner(name, client_id, status)")
    .eq("project.client_id", clientId)
    .neq("client_access", "none")
    .returns<{ id: string; client_access: BoardAccess; project: { name: string } }[]>();
  return (data ?? []).map((b) => ({ id: b.id, projectName: b.project.name, access: b.client_access })).sort((a, b) => a.projectName.localeCompare(b.projectName));
}

/** One board for the portal, only if it belongs to the client and is shared with them. */
export async function getPortalBoard(clientId: string, boardId: string): Promise<BoardData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(boardId)) return null;
  const { data } = await createAdminClient().from("boards").select(COLS).eq("id", boardId).maybeSingle<Row>();
  if (!data) return null;
  const board = toBoard(data);
  return board.clientId === clientId && board.clientAccess !== "none" ? board : null;
}
