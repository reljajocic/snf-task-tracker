import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT, toTask, type Person, type RawTask, type Task } from "@/lib/tasks";

/** Every video of a client the user can see (RLS), incl. published ones. */
export async function getClientVideos(clientId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("client_id", clientId)
    .eq("kind", "video")
    .order("publish_date", { nullsFirst: false })
    .returns<RawTask[]>();
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export type CallTime = { time: string; name: string; note: string };

export type ShootDay = {
  id: string;
  client: { id: string; name: string; locations: string[] } | null;
  date: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  call_times: CallTime[];
  crew: Person[];
  total: number;
  shot: number;
};

type RawShoot = Omit<ShootDay, "crew" | "total" | "shot"> & {
  shoot_crew: { profile: Person | null }[];
  tasks: { shot_status: string | null }[];
};

const SHOOT_SELECT = `
  id, date, location, starts_at, ends_at, notes, call_times,
  client:clients(id, name, locations),
  shoot_crew(profile:profiles(id, full_name, initials, avatar_bg, avatar_fg)),
  tasks(shot_status)
`;

function toShoot(raw: RawShoot): ShootDay {
  const { shoot_crew, tasks, ...rest } = raw;
  return {
    ...rest,
    starts_at: rest.starts_at?.slice(0, 5) ?? null,
    ends_at: rest.ends_at?.slice(0, 5) ?? null,
    call_times: (Array.isArray(rest.call_times) ? rest.call_times : []).sort((a, b) => a.time.localeCompare(b.time)),
    crew: shoot_crew.map((c) => c.profile).filter((p): p is Person => p !== null),
    total: tasks.length,
    shot: tasks.filter((x) => x.shot_status === "shot").length,
  };
}

export async function getShootDays(): Promise<ShootDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shoot_days").select(SHOOT_SELECT).order("date").returns<RawShoot[]>();
  if (error) throw error;
  return (data ?? []).map(toShoot);
}

export async function getShootDay(id: string) {
  const supabase = await createClient();
  const [{ data: day }, { data: videos }] = await Promise.all([
    supabase.from("shoot_days").select(SHOOT_SELECT).eq("id", id).maybeSingle<RawShoot>(),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("shoot_id", id)
      .order("shoot_time", { nullsFirst: false })
      .order("shoot_order", { nullsFirst: false })
      .order("created_at")
      .returns<RawTask[]>(),
  ]);
  if (!day) return null;
  return { day: toShoot(day), videos: (videos ?? []).map(toTask) };
}
