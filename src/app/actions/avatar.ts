"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// Profile photos: your own, or anyone's if you're the admin. Files go to the public "avatars"
// bucket under <user id>/; older ones in that folder are removed so only the current stays.

const BUCKET = "avatars";
const TYPES = ["image/webp", "image/jpeg", "image/png"];

async function allowed(userId: string) {
  const me = await requireProfile();
  return me.id === userId || me.role === "admin";
}

async function clearFolder(userId: string, keep?: string) {
  const storage = createAdminClient().storage.from(BUCKET);
  const { data } = await storage.list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await storage.remove(old);
}

export async function uploadAvatar(form: FormData): Promise<{ error: string | null }> {
  const userId = String(form.get("userId") ?? "");
  const file = form.get("file");
  if (!(await allowed(userId))) return { error: "Not allowed." };
  if (!(file instanceof Blob) || !TYPES.includes(file.type) || file.size > 1024 * 1024) return { error: "Use a JPG, PNG or WebP under 1 MB." };

  const admin = createAdminClient();
  const path = `${userId}/${Date.now()}.${file.type.split("/")[1]}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await admin.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (e2) return { error: e2.message };
  await clearFolder(userId, path);
  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeAvatar(userId: string): Promise<{ error: string | null }> {
  if (!(await allowed(userId))) return { error: "Not allowed." };
  const { error } = await createAdminClient().from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { error: error.message };
  await clearFolder(userId);
  revalidatePath("/", "layout");
  return { error: null };
}
