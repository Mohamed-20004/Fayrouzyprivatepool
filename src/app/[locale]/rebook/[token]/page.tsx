import { notFound } from "next/navigation";
import { chaletConfig } from "@/config/chalet.config";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { defaultCalendarMonth } from "@/lib/availability";
import { todayInChaletTz } from "@/lib/dates";
import { RebookClient } from "@/components/RebookClient";

export const dynamic = "force-dynamic";

export default async function RebookPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);

  const today = todayInChaletTz();
  const minMonth = today.slice(0, 7);
  const maxMonth = `${Number(today.slice(0, 4)) + 1}-${String(
    chaletConfig.season.endMonth
  ).padStart(2, "0")}`;

  return (
    <div className="container">
      <h2 style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
        {dict.rebookTitle}
      </h2>
      <RebookClient
        locale={l}
        token={token}
        labels={dict}
        currency={chaletConfig.currency}
        initialMonth={defaultCalendarMonth()}
        minMonth={minMonth}
        maxMonth={maxMonth}
      />
    </div>
  );
}
