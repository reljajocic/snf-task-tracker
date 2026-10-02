import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingNext, PageHeader } from "@/components/shell/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("list");
  return { title: t("title") };
}

export default async function ListPage() {
  const t = await getTranslations("list");
  return (
    <>
      <PageHeader title={t("title")} />
      <ComingNext />
    </>
  );
}
