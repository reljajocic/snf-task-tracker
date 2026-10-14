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
  editor_id: null,
  client: { default_editor_id: null, editor_rules: [{ editor_id: NATASA, days: [], types: [] }] },
  ...over,
});

describe("hand-off to the editor", () => {
  it("makes the client's editor the video's one editor, with a deadline the day before posting", async () => {
    const { db, writes } = fakeDb({ tasks: [video()] });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes.filter((w) => w.table === "tasks").map((w) => w.rows)).toEqual([{ due_date: "2026-10-19" }, { editor_id: NATASA }]);
    expect(writes.some((w) => w.table === "task_assignees")).toBe(false);
  });

  it("keeps an editor someone already picked", async () => {
    const { db, writes } = fakeDb({ tasks: [video({ editor_id: MARKO, due_date: "2026-10-18" })] });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes).toEqual([]);
  });

  it("leaves it without an editor when the client has no rule for it", async () => {
    const { db, writes } = fakeDb({ tasks: [video({ client: { default_editor_id: null, editor_rules: [{ editor_id: UROS, days: [], types: ["POST"] }] } })] });
    await handOffToEditor(db, "v1", "2026-10-20", "me");
    expect(writes.map((w) => w.rows)).toEqual([{ due_date: "2026-10-19" }]);
  });
});
