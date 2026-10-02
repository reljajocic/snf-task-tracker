import { requireAdmin } from "@/lib/auth";
import { ClientForm } from "../forms";

export default async function NewClientPage() {
  await requireAdmin();
  return <ClientForm />;
}
