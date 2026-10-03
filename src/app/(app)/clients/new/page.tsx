import { requireProfile } from "@/lib/auth";
import { getLookups } from "@/lib/data";
import { ClientForm } from "../forms";

export default async function NewClientPage() {
  await requireProfile();
  const lookups = await getLookups();
  return <ClientForm people={lookups.people} />;
}
