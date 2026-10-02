import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { ClientForm } from "../../forms";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  const [{ id }, me] = await Promise.all([params, requireProfile()]);
  const data = await getClient(id);
  if (!data) notFound();
  return <ClientForm client={data.client} canDelete={me.role === "admin"} />;
}
