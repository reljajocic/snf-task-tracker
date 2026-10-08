import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/notify", () => ({ notify: async () => {} }));

const { buildServer } = await import("./tools");

const CLIENT = { id: "11111111-1111-4111-8111-111111111111", name: "NoLimit Gym", status: "active", profiles: [], content_types: ["FUN"], locations: ["Liman"] };
const PEOPLE = [
  { id: "22222222-2222-4222-8222-222222222222", full_name: "Uroš Đuričić", initials: "UĐ", email: "uros@snf.test", is_active: true },
  { id: "33333333-3333-4333-8333-333333333333", full_name: "Marko Marković", initials: "MM", email: "marko@snf.test", is_active: true },
];

/** Just enough of the Supabase query builder: selects return the table's rows, writes are recorded. */
function fakeDb(tables: Record<string, unknown[]>) {
  const writes: { table: string; op: string; rows: unknown }[] = [];
  const from = (table: string) => {
    let op = "select";
    const result = () => (op === "select" ? { data: tables[table] ?? [], error: null } : { data: [{ id: "x" }], error: null });
    const builder: unknown = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then") return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
          if (prop === "insert" || prop === "update" || prop === "delete")
            return (rows?: unknown) => {
              op = prop;
              writes.push({ table, op: prop, rows });
              return builder;
            };
          if (prop === "single" || prop === "maybeSingle")
            return async () => (op === "insert" ? { data: { id: `new-${writes.length}` }, error: null } : { data: (tables[table] ?? [])[0] ?? null, error: null });
          return () => builder;
        },
      },
    );
    return builder;
  };
  return { db: { from } as never, writes };
}

async function connect(tables: Record<string, unknown[]>) {
  const { db, writes } = fakeDb(tables);
  const server = buildServer({ supabase: db, userId: PEOPLE[1].id, name: "Marko" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(b);
  return { client, writes };
}

describe("MCP tools", () => {
  it("offers the video tools", async () => {
    const { client } = await connect({});
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["create_shoot", "create_videos", "get_video", "list_clients", "list_people", "list_shoots", "list_videos", "update_video"]);
  });

  it("adds videos with the script split into parts, talent and team", async () => {
    const { client, writes } = await connect({ clients: [CLIENT], profiles: PEOPLE, task_assignees: [] });
    const res = await client.callTool({
      name: "create_videos",
      arguments: { client: "nolimit", videos: [{ title: "Najbolji split", script: "HOOK: Koji split?\nBODY: Pitamo ljude.", on_camera: ["Djole", "Rajko"], team: "uros", content_type: "fun" }] },
    });
    expect(res.isError).toBeFalsy();
    const task = writes.find((w) => w.table === "tasks" && w.op === "insert")!.rows as Record<string, unknown>;
    expect(task).toMatchObject({
      title: "Najbolji split",
      kind: "video",
      client_id: CLIENT.id,
      on_camera: "Djole, Rajko",
      content_type: "FUN",
      script: [
        { label: "HOOK", text: "Koji split?" },
        { label: "BODY", text: "Pitamo ljude." },
      ],
    });
    expect(writes.find((w) => w.table === "task_assignees")!.rows).toEqual([{ task_id: expect.any(String), user_id: PEOPLE[0].id }]);
  });

  it("says which names it couldn't match instead of guessing", async () => {
    const { client, writes } = await connect({ clients: [CLIENT], profiles: PEOPLE });
    const res = await client.callTool({ name: "create_videos", arguments: { client: "Berić", videos: [{ title: "X" }] } });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("NoLimit Gym");
    expect(writes).toEqual([]);
  });
});
