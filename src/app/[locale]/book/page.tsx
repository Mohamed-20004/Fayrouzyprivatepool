import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { chaletConfig, type SlotType } from "@/config/chalet.config";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { releaseExpiredHolds, slotState } from "@/lib/availability";
import { areConsecutiveDates, MAX_FLEX_DAYS, MAX_GROUP_DAYS } from "@/lib/bookings";
import { isValidDateStr } from "@/lib/dates";
import { priceFor } from "@/lib/pricing";
import { BookingForm, type BookingRequest } from "@/components/BookingForm";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    dates?: string;
    slot?: string;
    flexible?: string;
    month?: string;
    count?: string;
  }>;
}) {
  const { locale } = await params;
  const q = await searchParams;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);

  const slot = q.slot;
  if (slot !== "day" && slot !== "night") redirect(`/${l}`);
  const s = slot as SlotType;
  const slotCfg = chaletConfig.slots[s];
  const slotTimes = slotCfg.endsNextDay
    ? `${slotCfg.start} → ${slotCfg.end} (${dict.nextDayShort})`
    : `${slotCfg.start} → ${slotCfg.end}`;

  let booking: BookingRequest;
  let datesValue: string;
  let priceValue: string;

  if (q.flexible) {
    const month = q.month ?? "";
    const count = Number(q.count ?? 1);
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      !(count >= 1 && count <= MAX_FLEX_DAYS)
    ) {
      redirect(`/${l}#book`);
    }
    booking = { kind: "flexible", month, count, slot: s };
    const [y, m] = month.split("-").map(Number);
    const monthName = new Intl.DateTimeFormat(l, {
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
    datesValue = `${monthName} — ${dict.modeFlexible} × ${count}`;
    const fromPrice =
      s === "night"
        ? Math.min(chaletConfig.prices.nightWeekday, chaletConfig.prices.nightWeekend)
        : Math.min(chaletConfig.prices.dayWeekday, chaletConfig.prices.dayWeekend);
    priceValue = `${dict.fromWord} ${fromPrice * count} ${chaletConfig.currency}`;
  } else {
    const dates = (q.dates ?? "").split(",").filter(Boolean);
    if (
      dates.length < 1 ||
      dates.length > MAX_GROUP_DAYS ||
      !dates.every(isValidDateStr) ||
      !areConsecutiveDates(dates)
    ) {
      redirect(`/${l}#book`);
    }
    releaseExpiredHolds();
    for (const date of dates) {
      if (slotState(date, s) !== "available") redirect(`/${l}#book`);
    }
    booking = { kind: "dates", dates, slot: s };
    datesValue =
      dates.length === 1
        ? dates[0]
        : `${dates[0]} → ${dates[dates.length - 1]} (×${dates.length})`;
    const total = dates.reduce((sum, d) => sum + priceFor(d, s), 0);
    priceValue = `${total} ${chaletConfig.currency}`;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>{dict.bookTitle}</h2>
        <div className="summary-row">
          <span>{dict.bookDate}</span>
          <span className="value" dir="ltr">
            {datesValue}
          </span>
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
          <span className="price-big">{priceValue}</span>
        </div>
        {booking.kind === "flexible" && (
          <p className="note">{dict.flexNote} {dict.flexPriceNote}</p>
        )}

        <BookingForm locale={l} booking={booking} labels={dict} />

        <p style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
          <Link href={`/${l}#book`}>{dict.backToCalendar}</Link>
        </p>
      </div>
    </div>
  );
}
