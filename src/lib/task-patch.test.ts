import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/notify", () => ({ notify: async () => {} }));

const { handOffToEditor } = await import("./task-patch");

const MARKO = "marko";
const NATASA = "natasa";
const UROS = "uros";

/** Selects return the table's rows (single → the first), writes are recorded. */
function fakeDb(tables: Record<string, unknown[]>) {
  const writes: { table: string; op: string; rows?: unknown; in?: unknown }[] = [];
  const from = (table: string) => {
    let op = "select";
    const w: { table: string; op: string; rows?: unknown; in?: unknown } = { table, op };
    const builder: unknown = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then") return (res: (v: unknown) => unknown) => Promise.resolve({ data: op === "select" ? tables[table] ?? [] : null, error: null }).then(res);
          if (prop === "insert" || prop === "update" || prop === "delete")
            return (rows?: unknown) => {
              op = prop;
              Object.assign(w, { op: prop, rows });
              writes.push(w);
              return builder;
            };
          if (prop === "in") return (_col: string, vals: unknown) => ((w.in = vals), builder);
          if (prop === "single" || prop === "maybeSingle") return async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null });
          return () => builder;
        },
      },
    );
    return builder;
  };
  return { db: { from } as never, writes };
}

const video = (over: Record<string, unknown> = {}) => ({
  kind: "video",
  due_date: null,
  content_type: "REEL",
  phase: 2,
  shot_status: "shot",
  shoot_id: "shoot1",
  client: { default_editor_id: null, editor_rules: [{ editor_id: NATASA, days: [], types: [] }] },
  task_assignees: [{ user_id: MARKO }, { user_id: UROS }],
  ...over,
});

describe("hand-off to the editor", () => {
  it("gives a filmed video to the editor and takes the shoot crew off it", async () => {
    const { db, writes } = fakeDb({ tasks: [video()], shoot_crew: [{ user_id: MARKO }] });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes.find((w) => w.table === "task_assignees" && w.op === "insert")?.rows).toEqual({ task_id: "v1", user_id: NATASA });
    // Marko filmed it: off. Uroš wasn't crew: stays.
    expect(writes.find((w) => w.table === "task_assignees" && w.op === "delete")?.in).toEqual([MARKO]);
    expect(writes.find((w) => w.table === "tasks")?.rows).toEqual({ due_date: "2026-10-19" });
  });

  it("keeps a crew member who is also the editor", async () => {
    const { db, writes } = fakeDb({
      tasks: [video({ client: { default_editor_id: null, editor_rules: [{ editor_id: MARKO, days: [], types: [] }] } })],
      shoot_crew: [{ user_id: MARKO }],
    });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes.some((w) => w.table === "task_assignees" && w.op === "delete")).toBe(false);
  });

  it("leaves the crew on a video that isn't filmed yet", async () => {
    const { db, writes } = fakeDb({ tasks: [video({ phase: 1, shot_status: "to_shoot" })], shoot_crew: [{ user_id: MARKO }] });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes.some((w) => w.op === "delete")).toBe(false);
    expect(writes.find((w) => w.op === "insert")?.rows).toEqual({ task_id: "v1", user_id: NATASA });
  });
});
