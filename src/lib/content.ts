import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT, toTask, type Person, type RawTask, type Task } from "@/lib/tasks";

/**
 * Which of a client's videos to load. A client's whole history is big (NoLimit: ~860 videos with
 * scripts, ~1 MB), so every page asks only for what it shows.
 *  - posting: posted in [from, to], plus open videos without a date (the "shot, no date" queue)
 *  - bank: not dated and not finished (ideas, on a shoot, shot without a date)
 *  - dropped: dropped videos
 */
export type VideoScope = { posting: { from: string; to: string } } | { bank: true } | { dropped: true };

export async function getClientVideos(clientId: string, scope: VideoScope): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(TASK_SELECT).eq("client_id", clientId).eq("kind", "video");
  if ("posting" in scope) {
    const { from, to } = scope.posting;
    query = query.or(`and(publish_date.gte.${from},publish_date.lte.${to}),and(publish_date.is.null,dropped_at.is.null,phase.lt.5)`);
  } else if ("bank" in scope) {
    query = query.is("publish_date", null).is("dropped_at", null).lt("phase", 5);
  } else {
    query = query.not("dropped_at", "is", null);
  }
  const { data, error } = await query.order("publish_date", { nullsFirst: false }).returns<RawTask[]>();
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function countDropped(clientId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("kind", "video")
    .not("dropped_at", "is", null);
  return count ?? 0;
}

/** Date of the client's last shoot before `date` (its leftovers can go on the next one). */
export async function previousShootDate(clientId: string, date: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shoot_days")
    .select("date")
    .eq("client_id", clientId)
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.date ?? null;
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
  drive_url: string | null;
  signup_token: string | null;
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
  id, date, location, starts_at, ends_at, notes, drive_url, signup_token, call_times,
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
      .order("shoot_order", { nullsFirst: false })
      .order("created_at")
      .returns<RawTask[]>(),
  ]);
  if (!day) return null;
  return { day: toShoot(day), videos: (videos ?? []).map(toTask) };
}
