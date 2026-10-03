import { requireAdmin } from "@/lib/auth";
import { getLookups } from "@/lib/data";
import { ClientForm } from "../forms";

export default async function NewClientPage() {
  await requireAdmin();
  const lookups = await getLookups();
  return <ClientForm people={lookups.people} />;
}
