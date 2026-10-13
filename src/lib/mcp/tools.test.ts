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
  const rpc = async (fn: string, args: unknown) => {
    writes.push({ table: `rpc:${fn}`, op: "rpc", rows: args });
    return { data: "h1", error: null };
  };
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
  return { db: { from, rpc } as never, writes };
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
    expect(tools.map((t) => t.name).sort()).toEqual([
      "create_shoot",
      "create_videos",
      "get_video",
      "list_clients",
      "list_people",
      "list_shoots",
      "list_videos",
      "return_to_ideas",
      "update_video",
    ]);
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

const ATTEMPT = {
  shoot_date: "2026-09-23",
  location: "Novo Naselje",
  shoot_time: null,
  on_camera: "Petar",
  shot_status: "shot",
  publish_date: "2026-10-20",
  reason: "loš sagovornik",
  returned_at: "2026-10-13T09:12:34Z",
  returned_by: { full_name: "Relja" },
};
const VIDEO = {
  id: "44444444-4444-4444-8444-444444444444",
  title: "6 razloga",
  content_type: "GYM",
  location: "Novo Naselje",
  profile: null,
  on_camera: "Petar",
  script: [],
  phase: 2,
  shot_status: "shot",
  publish_date: "2026-10-20",
  dropped_at: null,
  shoot_time: "20:00",
  shoot_order: 0,
  created_at: "2026-09-01",
  note: null,
  reference_url: null,
  drive_url: null,
  client: { id: CLIENT.id, name: CLIENT.name },
  shoot: { id: "s1", date: "2026-09-23", location: "Novo Naselje" },
  task_assignees: [{ profile: { id: PEOPLE[0].id, full_name: PEOPLE[0].full_name } }],
  shoot_history: [],
};

describe("MCP reshoots", () => {
  it("return_to_ideas sends a filmed video back with its reason", async () => {
    const { client, writes } = await connect({ tasks: [VIDEO], task_assignees: [{ user_id: PEOPLE[0].id }] });
    const res = await client.callTool({ name: "return_to_ideas", arguments: { id: VIDEO.id, reason: " loš sagovornik " } });
    expect(res.isError).toBeFalsy();
    expect(writes.find((w) => w.table === "rpc:return_to_ideas")!.rows).toEqual({ tid: VIDEO.id, why: "loš sagovornik" });
  });

  it("won't return a plain idea, and needs a reason", async () => {
    const plain = { ...VIDEO, phase: 0, shot_status: "to_shoot", publish_date: null, shoot: null, shoot_time: null };
    const { client, writes } = await connect({ tasks: [plain] });
    const res = await client.callTool({ name: "return_to_ideas", arguments: { id: VIDEO.id, reason: "x" } });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("already an idea");
    const noReason = await client.callTool({ name: "return_to_ideas", arguments: { id: VIDEO.id, reason: "" } });
    expect(noReason.isError).toBe(true);
    expect(writes).toEqual([]);
  });

  it("list_videos and get_video show the reshoot mark and the history; plain ideas stay unmarked", async () => {
    const returned = { ...VIDEO, phase: 0, shot_status: "to_shoot", publish_date: null, shoot: null, shoot_time: null, shoot_history: [ATTEMPT] };
    const plain = { ...returned, id: "55555555-5555-4555-8555-555555555555", title: "Nova ideja", shoot_history: [] };
    const { client } = await connect({ clients: [CLIENT], tasks: [returned, plain] });
    const list = await client.callTool({ name: "list_videos", arguments: { client: "NoLimit", shelf: "ideas" } });
    const { videos } = JSON.parse((list.content as { text: string }[])[0].text);
    expect(videos.map((v: { title: string; reshoot: unknown; shoot_attempts: number }) => [v.title, v.reshoot, v.shoot_attempts])).toEqual([
      ["6 razloga", { reason: "loš sagovornik", filmed_on: "2026-09-23" }, 1],
      ["Nova ideja", null, 0],
    ]);
    const one = await client.callTool({ name: "get_video", arguments: { id: VIDEO.id } });
    expect(JSON.parse((one.content as { text: string }[])[0].text).shoot_history).toEqual([
      { shoot_date: "2026-09-23", location: "Novo Naselje", time: null, on_camera: "Petar", shot_status: "shot", was_posting: "2026-10-20", reason: "loš sagovornik", returned_at: "2026-10-13T09:12:34Z", returned_by: "Relja" },
    ]);
  });

  it("a returned video put on a shoot day again keeps its history but loses the mark", async () => {
    const rescheduled = { ...VIDEO, phase: 1, shot_status: "to_shoot", publish_date: null, shoot: { id: "s2", date: "2026-10-30", location: "Liman" }, shoot_history: [ATTEMPT] };
    const { client } = await connect({ tasks: [rescheduled] });
    const one = JSON.parse(((await client.callTool({ name: "get_video", arguments: { id: VIDEO.id } })).content as { text: string }[])[0].text);
    expect(one.reshoot).toBeNull();
    expect(one.shoot_attempts).toBe(1);
    expect(one.shoot_history).toHaveLength(1);
  });
});
