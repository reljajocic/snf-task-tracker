"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireProfile } from "@/lib/auth";
import { emailClient } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

// A month's report: the team's word for the client, and publishing it to the portal (RLS: the client's managers).

const MONTH = /^\d{4}-\d{2}$/;

export async function saveReport(clientId: string, month: string, summary: string, publish: boolean | null) {
  const me = await requireProfile();
  if (!MONTH.test(month)) return { error: "Month?" };
  const supabase = await createClient();
  const { data: before } = await supabase.from("portal_reports").select("published_at").eq("client_id", clientId).eq("month", month).maybeSingle();
  const publishedAt = publish === null ? (before?.published_at ?? null) : publish ? (before?.published_at ?? new Date().toISOString()) : null;
  const { error } = await supabase.from("portal_reports").upsert({
    client_id: clientId,
    month,
    summary: summary.trim().slice(0, 4000) || null,
    published_at: publishedAt,
    published_by: publish ? me.id : undefined,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  // Newly out: the client's people who approve get an email with a link to it.
  if (publish && !before?.published_at) {
    after(() =>
      emailClient({
        clientId,
        subject: `Your report for ${month}`,
        heading: "Your monthly report is ready",
        lines: summary.trim() ? [summary.trim().slice(0, 600)] : [],
        path: `/reports?m=${month}`,
      }),
    );
  }
  revalidatePath(`/clients/${clientId}/reports`);
  return { error: null };
}
