import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ClientForm } from "../forms";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  await requireAdmin();
  return <ClientForm />;
}
