import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { getLookups } from "@/lib/data";
import { ClientForm } from "../../forms";

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  const [{ id }, me, lookups] = await Promise.all([params, requireProfile(), getLookups()]);
  const data = await getClient(id);
  if (!data) notFound();
  const canDelete = me.role === "admin" || data.members.some((m) => m.profile.id === me.id && m.role === "manager");
  return <ClientForm client={data.client} canDelete={canDelete} people={lookups.people} />;
}
