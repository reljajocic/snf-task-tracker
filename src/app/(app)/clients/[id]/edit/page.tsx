import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getLookups } from "@/lib/data";
import { ClientForm } from "../../forms";

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  const [{ id }, me, lookups] = await Promise.all([params, requireProfile(), getLookups()]);
  const data = await getClient(id);
  if (!data) notFound();
  return <ClientForm client={data.client} canDelete={me.role === "admin"} people={lookups.people} />;
}
