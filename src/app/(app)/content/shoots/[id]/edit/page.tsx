import { notFound } from "next/navigation";
import { getShootDay } from "@/lib/content";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { ShootForm } from "../../ShootForm";

export default async function EditShootPage({ params }: PageProps<"/content/shoots/[id]/edit">) {
  const [{ id }, lookups] = await Promise.all([params, getLookups()]);
  const data = await getShootDay(id);
  if (!data || !data.day.client) notFound();
  const { day } = data;
  return (
    <ShootForm
      clients={lookups.clients.filter((c) => c.isTeam)}
      people={lookups.people}
      defaultDate={today()}
      shoot={{
        id: day.id,
        client_id: day.client!.id,
        date: day.date,
        location: day.location,
        starts_at: day.starts_at,
        ends_at: day.ends_at,
        notes: day.notes,
        drive_url: day.drive_url,
        crew: day.crew.map((c) => c.id),
      }}
    />
  );
}
