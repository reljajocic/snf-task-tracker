// Re-split saved scripts after the label rules grew ("Open loop 1:", "Hook opcije:", "Hooks").
//   JITI… scripts/resplit-scripts.ts            # dry run: how many change, a few examples
//   JITI… scripts/resplit-scripts.ts --write    # save them
import { createClient } from "@supabase/supabase-js";
import { sectionsToText, textToSections } from "@/lib/script-text";

const write = process.argv.includes("--write");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const { data, error } = await s.from("tasks").select("id, title, script").eq("kind", "video").neq("script", "[]");
if (error) throw error;
// Compare content only (labels and trimmed text), not whitespace or key order.
const norm = (x: { label: string; text: string }[]) => JSON.stringify(x.map((p) => [p.label.trim().toUpperCase(), p.text.trim()]));
const changes = (data ?? []).flatMap((t) => {
  const next = textToSections(sectionsToText(t.script));
  return norm(next) === norm(t.script) ? [] : [{ ...t, next }];
});
console.log(`${changes.length} of ${data?.length} scripts get split differently.`);
for (const c of changes.slice(0, 3)) console.log(`  ${c.title}: ${c.script.length} → ${c.next.length} parts (${c.next.map((x) => x.label || "—").join(", ")})`);
if (write) {
  for (const c of changes) {
    const { error: e } = await s.from("tasks").update({ script: c.next }).eq("id", c.id);
    if (e) throw e;
  }
  console.log("Saved.");
}
