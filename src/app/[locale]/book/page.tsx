import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { chaletConfig, type SlotType } from "@/config/chalet.config";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { releaseExpiredHolds, slotState } from "@/lib/availability";
import { isValidDateStr } from "@/lib/dates";
import { priceFor } from "@/lib/pricing";
import { BookingForm } from "@/components/BookingForm";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const { locale } = await params;
  const { date, slot } = await searchParams;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);

  if (
    !date ||
    !isValidDateStr(date) ||
    (slot !== "day" && slot !== "night")
  ) {
    redirect(`/${l}`);
  }
  const s = slot as SlotType;

  releaseExpiredHolds();
  if (slotState(date, s) !== "available") {
    redirect(`/${l}#calendar`);
  }

  const price = priceFor(date, s);
  const slotCfg = chaletConfig.slots[s];
  const slotTimes = slotCfg.endsNextDay
    ? `${slotCfg.start} → ${slotCfg.end} (${dict.nextDayShort})`
    : `${slotCfg.start} → ${slotCfg.end}`;

  return (
    <div className="container">
      <div className="card">
        <h2>{dict.bookTitle}</h2>
        <div className="summary-row">
          <span>{dict.bookDate}</span>
          <span className="value">{date}</span>
        </div>
        <div className="summary-row">
          <span>{dict.bookSlot}</span>
          <span className="value">
            {s === "day" ? dict.daySlot : dict.nightSlot}{" "}
            <span dir="ltr">{slotTimes}</span>
          </span>
        </div>
        <div className="summary-row">
          <span>{dict.bookPrice}</span>
          <span className="price-big">
            {price} {chaletConfig.currency}
          </span>
        </div>

        <BookingForm locale={l} date={date} slot={s} labels={dict} />

        <p style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
          <Link href={`/${l}#calendar`}>{dict.backToCalendar}</Link>
        </p>
      </div>
    </div>
  );
}
