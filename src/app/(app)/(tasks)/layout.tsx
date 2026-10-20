import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TaskViewTabs } from "./TaskViewTabs";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  // The admin login oversees from its overview; tasks are the team's.
  if ((await requireProfile()).role === "admin") redirect("/");
  return (
    <>
      <TaskViewTabs />
      {children}
    </>
  );
}
