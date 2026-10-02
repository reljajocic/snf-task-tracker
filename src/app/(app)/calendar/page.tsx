import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingNext, PageHeader } from "@/components/shell/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  return (
    <>
      <PageHeader title={t("title")} />
      <ComingNext />
    </>
  );
}
