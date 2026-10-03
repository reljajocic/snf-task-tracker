import { TaskViewTabs } from "./TaskViewTabs";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TaskViewTabs />
      {children}
    </>
  );
}
