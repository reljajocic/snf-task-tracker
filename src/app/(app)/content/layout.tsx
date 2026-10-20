import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { ContentTabs } from "./ContentTabs";

export default async function ContentLayout({ children }: LayoutProps<"/content">) {
  // The admin login oversees from its overview; shoots, schedule and the video bank are the team's.
  if ((await requireProfile()).role === "admin") redirect("/");
  return (
    <>
      <Suspense>
        <ContentTabs />
      </Suspense>
      {children}
    </>
  );
}
