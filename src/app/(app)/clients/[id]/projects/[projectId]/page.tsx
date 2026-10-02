import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getLookups } from "@/lib/data";
import { ProjectForm } from "../../../forms";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/clients/[id]/projects/[projectId]">) {
  const [{ id, projectId }, lookups] = await Promise.all([params, getLookups()]);
  const data = await getClient(id);
  const project = data?.projects.find((p) => p.id === projectId);
  if (!project) notFound();
  return <ProjectForm clientId={id} project={project} people={lookups.people} />;
}
