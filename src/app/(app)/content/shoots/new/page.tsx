import { redirect } from "next/navigation";
import { getLookups } from "@/lib/data";
import { today } from "@/lib/dates";
import { rememberedClient } from "@/lib/remembered-client";
import { ShootForm } from "../ShootForm";

// ?client=<id> (from the shoots page or a client) picks the client; otherwise the one last looked at.
export default async function NewShootPage({ searchParams }: PageProps<"/content/shoots/new">) {
  const [{ client }, lookups, remembered] = await Promise.all([searchParams, getLookups(), rememberedClient()]);
  const clients = lookups.clients.filter((c) => c.isTeam);
  if (!clients.length) redirect("/content/shoots");
  const wanted = typeof client === "string" ? client : remembered;
  const first = clients.find((c) => c.id === wanted);
  const sorted = first ? [first, ...clients.filter((c) => c !== first)] : clients;
  return <ShootForm clients={sorted} people={lookups.people} defaultDate={today()} />;
}
