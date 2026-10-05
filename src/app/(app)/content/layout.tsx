import { Suspense } from "react";
import { ContentTabs } from "./ContentTabs";

export default function ContentLayout({ children }: LayoutProps<"/content">) {
  return (
    <>
      <Suspense>
        <ContentTabs />
      </Suspense>
      {children}
    </>
  );
}
