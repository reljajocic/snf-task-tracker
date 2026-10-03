import { ContentTabs } from "./ContentTabs";

export default function ContentLayout({ children }: LayoutProps<"/content">) {
  return (
    <>
      <ContentTabs />
      {children}
    </>
  );
}
