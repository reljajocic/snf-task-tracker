import { getTranslations } from "next-intl/server";
import { ComingNext, PageHeader } from "@/components/shell/PageHeader";
import { formatDate, today, weekdayIndex } from "@/lib/dates";

export default async function HomePage() {
  const t = await getTranslations();
  const now = today();
  return (
    <>
      <PageHeader
        title={t("home.title")}
        eyebrow={`${t("weekday.long", { day: String(weekdayIndex(now)) })}, ${formatDate(now)}`}
      />
      <ComingNext />
    </>
  );
}
