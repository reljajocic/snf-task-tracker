import { redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { ShootForm } from "../ShootForm";

export default async function NewShootPage({ searchParams }: PageProps<"/content/shoots/new">) {
  const [{ client }, lookups] = await Promise.all([searchParams, getLookups()]);
  const clients = lookups.clients.filter((c) => c.canManage);
  if (!clients.length) redirect("/content/shoots");
  const sorted = typeof client === "string" ? [...clients].sort((a) => (a.id === client ? -1 : 0)) : clients;
  return <ShootForm clients={sorted} people={lookups.people} defaultDate={today()} />;
}
