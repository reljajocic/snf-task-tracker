"use server";

import { requireProfile } from "@/lib/auth";
import { getPortalBoard, type BoardAccess, type BoardFiles } from "@/lib/boards";
import { getPortal } from "@/lib/portal";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

// Moodboard actions. Team: image upload and client access (the scene itself syncs from the browser
// through RLS). Portal: load / save / upload, checked against the portal token and the board's access.

const BUCKET = "boards";
const TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];
const MAX = 4 * 1024 * 1024;
const MAX_ELEMENTS = 5000;

async function store(boardId: string, fileId: string, file: unknown): Promise<{ url: string } | { error: string }> {
  if (!(file instanceof Blob) || !TYPES.includes(file.type) || file.size > MAX) return { error: "Use a JPG, PNG, WebP or GIF under 4 MB." };
  if (!/^[\w-]{1,80}$/.test(fileId)) return { error: "Bad file id." };
  const admin = createAdminClient();
  const path = `${boardId}/${fileId}.${file.type.split("/")[1]}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: error.message };
  return { url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function uploadBoardImage(boardId: string, fileId: string, form: FormData) {
  await requireProfile();
  const supabase = await createClient();
  // RLS: only people who can use the board see it.
  const { data } = await supabase.from("boards").select("id").eq("id", boardId).maybeSingle();
  if (!data) return { error: "Not allowed." };
  return store(boardId, fileId, form.get("file"));
}

export async function setBoardAccess(boardId: string, access: BoardAccess): Promise<{ error: string | null }> {
  await requireProfile();
  if (!["none", "view", "edit"].includes(access)) return { error: "Bad value." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").update({ client_access: access }).eq("id", boardId).select("id");
  if (error) return { error: error.message };
  return { error: data?.length ? null : "Not allowed." };
}

async function portalBoard(token: string, boardId: string) {
  const portal = await getPortal(token);
  return portal ? getPortalBoard(portal.clientId, boardId) : null;
}

export async function portalLoadBoard(token: string, boardId: string): Promise<{ elements: unknown[]; files: BoardFiles } | null> {
  const board = await portalBoard(token, boardId);
  return board ? { elements: board.elements, files: board.files } : null;
}

export async function portalSaveBoard(token: string, boardId: string, elements: unknown[], newFiles: BoardFiles): Promise<{ elements: unknown[] } | null> {
  const board = await portalBoard(token, boardId);
  if (!board || board.clientAccess !== "edit" || !Array.isArray(elements) || elements.length > MAX_ELEMENTS) return null;
  const { data, error } = await createAdminClient().rpc("board_merge", { bid: board.id, incoming: elements as Json, new_files: newFiles as Json });
  if (error) return null;
  return { elements: Array.isArray(data) ? data : [] };
}

export async function portalUploadBoardImage(token: string, boardId: string, fileId: string, form: FormData) {
  const board = await portalBoard(token, boardId);
  if (!board || board.clientAccess !== "edit") return { error: "Not allowed." };
  return store(board.id, fileId, form.get("file"));
}
