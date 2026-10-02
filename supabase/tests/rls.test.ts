// Runs every migration in an in-memory Postgres (PGlite) with a minimal stand-in for
// Supabase's auth schema, then checks who can see and change what.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = join(__dirname, "..", "migrations");

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const MANAGER = "00000000-0000-0000-0000-00000000000b";
const MEMBER = "00000000-0000-0000-0000-00000000000c";
const OUTSIDER = "00000000-0000-0000-0000-00000000000d";
const C1 = "00000000-0000-0000-0000-0000000000c1";
const C2 = "00000000-0000-0000-0000-0000000000c2";

const db = new PGlite();

type Row = Record<string, unknown>;

/** Runs a query as the given user through RLS, like a request from the app would. */
async function as<T = Row>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  await db.exec("set role authenticated");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

const titles = async (uid: string) =>
  (await as<{ title: string }>(uid, "select title from public.tasks order by title")).map(
    (r) => r.title,
  );

let P1: string;
let t1: string;
let t4: string;

beforeAll(async () => {
  await db.exec(`
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `);
  for (const file of readdirSync(MIGRATIONS).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    insert into auth.users values
      ('${ADMIN}', 'admin@snf.test', '{"full_name":"Admin","role":"admin"}'),
      ('${MANAGER}', 'marko@snf.test', '{"full_name":"Marko"}'),
      ('${MEMBER}', 'uros@snf.test', '{"full_name":"Uroš","initials":"U"}'),
      ('${OUTSIDER}', 'other@snf.test', '{}');
    insert into public.clients (id, name) values ('${C1}', 'C1'), ('${C2}', 'C2');
    insert into public.client_members values
      ('${C1}', '${MANAGER}', 'manager', now()),
      ('${C1}', '${MEMBER}', 'member', now());
  `);

  [{ id: P1 }] = await as<{ id: string }>(
    MANAGER,
    "insert into public.projects (client_id, name) values ($1, 'P1') returning id",
    [C1],
  );
  await db.query("insert into public.project_members (project_id, user_id) values ($1, $2)", [
    P1,
    MEMBER,
  ]);
  [{ id: t1 }] = await as<{ id: string }>(
    MANAGER,
    "insert into public.tasks (title, project_id) values ('T1 assigned', $1) returning id",
    [P1],
  );
  await as(MANAGER, "insert into public.task_assignees (task_id, user_id) values ($1, $2)", [
    t1,
    MEMBER,
  ]);
  [{ id: t4 }] = await as<{ id: string }>(
    MANAGER,
    "insert into public.tasks (title, project_id) values ('T4 unassigned', $1) returning id",
    [P1],
  );
  await as(MANAGER, "insert into public.tasks (title, client_id) values ('T2 client only', $1)", [
    C1,
  ]);
  await as(MEMBER, "insert into public.tasks (title) values ('T3 personal')");
});

describe("profiles", () => {
  it("are created from invite metadata", async () => {
    const rows = await db.query<Row>("select email, role, initials from public.profiles order by email");
    expect(rows.rows).toContainEqual({ email: "admin@snf.test", role: "admin", initials: "A" });
    expect(rows.rows).toContainEqual({ email: "uros@snf.test", role: "user", initials: "U" });
  });

  it("can't be promoted by their owner", async () => {
    await expect(
      as(MEMBER, "update public.profiles set role = 'admin' where id = $1", [MEMBER]),
    ).rejects.toThrow(/Only an admin/);
    expect(
      await as(MEMBER, "update public.profiles set theme = 'light' where id = $1 returning theme", [MEMBER]),
    ).toEqual([{ theme: "light" }]);
  });
});

describe("task visibility", () => {
  it("admin sees everything, including personal tasks", async () => {
    expect(await titles(ADMIN)).toEqual(["T1 assigned", "T2 client only", "T3 personal", "T4 unassigned"]);
  });

  it("manager sees all of their client's tasks but not personal ones", async () => {
    expect(await titles(MANAGER)).toEqual(["T1 assigned", "T2 client only", "T4 unassigned"]);
  });

  it("member sees their projects and own personal tasks", async () => {
    expect(await titles(MEMBER)).toEqual(["T1 assigned", "T3 personal", "T4 unassigned"]);
  });

  it("outsider sees nothing", async () => {
    expect(await titles(OUTSIDER)).toEqual([]);
  });
});

describe("task changes", () => {
  it("member can create tasks only inside their projects or personally", async () => {
    expect(
      await as(MEMBER, "insert into public.tasks (title, project_id) values ('Mine in P1', $1) returning client_id", [P1]),
    ).toEqual([{ client_id: C1 }]);
    await expect(
      as(MEMBER, "insert into public.tasks (title, client_id) values ('x', $1)", [C1]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(MEMBER, "insert into public.tasks (title, client_id) values ('x', $1)", [C2]),
    ).rejects.toThrow(/row-level security/);
  });

  it("member edits assigned tasks but not others in the project", async () => {
    expect(
      await as(MEMBER, "update public.tasks set status = 'done' where id = $1 returning completed_at is not null as done", [t1]),
    ).toEqual([{ done: true }]);
    expect(await as(MEMBER, "update public.tasks set title = 'x' where id = $1 returning id", [t4])).toEqual([]);
  });

  it("member can't move a task to a client they don't belong to", async () => {
    await expect(
      as(MEMBER, "update public.tasks set client_id = $2, project_id = null where id = $1", [t1, C2]),
    ).rejects.toThrow(/Not allowed to move/);
  });

  it("subtasks inherit client and project from the parent", async () => {
    expect(
      await as(MEMBER, "insert into public.tasks (title, parent_id) values ('sub', $1) returning kind, project_id", [t1]),
    ).toEqual([{ kind: "subtask", project_id: P1 }]);
  });
});

describe("comments", () => {
  it("anyone who sees the task can comment; others can't", async () => {
    expect(
      await as(MEMBER, "insert into public.task_comments (task_id, author_id, body) values ($1, $2, 'hi') returning body", [t4, MEMBER]),
    ).toEqual([{ body: "hi" }]);
    await expect(
      as(OUTSIDER, "insert into public.task_comments (task_id, author_id, body) values ($1, $2, 'hi')", [t4, OUTSIDER]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("clients and projects", () => {
  it("only admins create clients; managers edit theirs", async () => {
    await expect(as(MANAGER, "insert into public.clients (name) values ('X')")).rejects.toThrow(/row-level security/);
    expect(await as(MANAGER, "update public.clients set city = 'Beograd' where id = $1 returning city", [C1])).toEqual([
      { city: "Beograd" },
    ]);
    expect(await as(MANAGER, "update public.clients set city = 'x' where id = $1 returning id", [C2])).toEqual([]);
  });

  it("members can't create projects", async () => {
    await expect(
      as(MEMBER, "insert into public.projects (client_id, name) values ($1, 'X')", [C1]),
    ).rejects.toThrow(/row-level security/);
  });
});
