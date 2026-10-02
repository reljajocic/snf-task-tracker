import { getLookups } from "@/lib/data";
import { ProjectForm } from "../../../forms";

export default async function NewProjectPage({ params }: PageProps<"/clients/[id]/projects/new">) {
  const [{ id }, lookups] = await Promise.all([params, getLookups()]);
  return <ProjectForm clientId={id} people={lookups.people} />;
}
