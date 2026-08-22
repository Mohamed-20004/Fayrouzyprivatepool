"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { chaletConfig } from "@/config/chalet.config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Calendar, type CalendarLabels } from "@/components/Calendar";
import { IconMoon, IconSun } from "@/components/Icons";

type Labels = CalendarLabels &
  Pick<
    Dictionary,
    | "summaryTitle"
    | "selectSlotHint"
    | "proceedPayment"
    | "bookDate"
    | "bookSlot"
    | "bookPrice"
    | "includedTitle"
    | "nextDayShort"
    | "modeSpecific"
    | "modeFlexible"
    | "flexMonthLabel"
    | "flexCountDays"
    | "flexCountNights"
    | "flexNote"
    | "flexPriceNote"
    | "rangeHint"
    | "fromWord"
  > & { included: string[] };

/**
 * Booking layout: calendar (with consecutive-range selection) or the
 * Flexible panel — guests who don't care about exact dates pick a month and
 * a number of days, and the chalet assigns a random available run.
 */
export function BookingSection({
  locale,
  labels,
  currency,
  initialMonth,
  minMonth,
  maxMonth,
}: {
  locale: Locale;
  labels: Labels;
  currency: string;
  initialMonth: string;
  minMonth: string;
  maxMonth: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"dates" | "flexible">("dates");
  const [selection, setSelection] = useState<{
    dates: string[];
    slot: "day" | "night";
    total: number;
  } | null>(null);
  const [flexMonth, setFlexMonth] = useState(initialMonth);
  const [flexSlot, setFlexSlot] = useState<"day" | "night">("night");
  const [flexCount, setFlexCount] = useState(1);

  // Months from now to the horizon that fall inside the season.
  const seasonMonths = useMemo(() => {
    const out: string[] = [];
    let [y, m] = minMonth.split("-").map(Number);
    const [maxY, maxM] = maxMonth.split("-").map(Number);
    while (y < maxY || (y === maxY && m <= maxM)) {
      if (m >= chaletConfig.season.startMonth && m <= chaletConfig.season.endMonth) {
        out.push(`${y}-${String(m).padStart(2, "0")}`);
      }
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }, [minMonth, maxMonth]);

  const monthName = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(Date.UTC(y, m - 1, 1))
    );
  };

  const slotCfg = selection ? chaletConfig.slots[selection.slot] : null;
  const slotTimes = slotCfg
    ? slotCfg.endsNextDay
      ? `${slotCfg.start} → ${slotCfg.end} (${labels.nextDayShort})`
      : `${slotCfg.start} → ${slotCfg.end}`
    : null;

  const datesValue = selection
    ? selection.dates.length === 1
      ? selection.dates[0]
      : `${selection.dates[0]} → ${selection.dates[selection.dates.length - 1]} (×${selection.dates.length})`
    : "—";

  const flexFromPrice =
    flexSlot === "night"
      ? Math.min(chaletConfig.prices.nightWeekday, chaletConfig.prices.nightWeekend)
      : Math.min(chaletConfig.prices.dayWeekday, chaletConfig.prices.dayWeekend);

  function proceed() {
    if (mode === "flexible") {
      router.push(
        `/${locale}/book?flexible=1&month=${flexMonth}&count=${flexCount}&slot=${flexSlot}`
      );
    } else if (selection) {
      router.push(
        `/${locale}/book?dates=${selection.dates.join(",")}&slot=${selection.slot}`
      );
    }
  }

  return (
    <>
      <div className="cal-toggle" style={{ maxWidth: 420, marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className={mode === "dates" ? "active" : ""}
          onClick={() => setMode("dates")}
        >
          {labels.modeSpecific}
        </button>
        <button
          type="button"
          className={mode === "flexible" ? "active" : ""}
          onClick={() => setMode("flexible")}
        >
          {labels.modeFlexible}
        </button>
      </div>

      <div className="book-grid">
        {mode === "dates" ? (
          <div>
            <Calendar
              locale={locale}
              labels={labels}
              currency={currency}
              initialMonth={initialMonth}
              minMonth={minMonth}
              maxMonth={maxMonth}
              rangeSelect
              onSelect={(dates, slot, total) => setSelection({ dates, slot, total })}
              selected={selection}
            />
            <p className="compare-hint" style={{ marginTop: "var(--space-2)" }}>
              {labels.rangeHint}
            </p>
          </div>
        ) : (
          <div className="panel flex-panel">
            <div className="cal-toggle" style={{ marginBottom: "var(--space-4)" }}>
              <button
                type="button"
                className={flexSlot === "day" ? "active" : ""}
                onClick={() => setFlexSlot("day")}
              >
                <IconSun size={15} /> {labels.daySlot}
              </button>
              <button
                type="button"
                className={flexSlot === "night" ? "active" : ""}
                onClick={() => setFlexSlot("night")}
              >
                <IconMoon size={15} /> {labels.nightSlot}
              </button>
            </div>

            <div className="field">
              <label htmlFor="flex-month">{labels.flexMonthLabel}</label>
              <select
                id="flex-month"
                className="select"
                value={flexMonth}
                onChange={(e) => setFlexMonth(e.target.value)}
              >
                {seasonMonths.map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>
                {flexSlot === "day" ? labels.flexCountDays : labels.flexCountNights}
              </label>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setFlexCount((c) => Math.max(1, c - 1))}
                  aria-label="−"
                >
                  −
                </button>
                <span>{flexCount}</span>
                <button
                  type="button"
                  onClick={() => setFlexCount((c) => Math.min(7, c + 1))}
                  aria-label="+"
                >
                  +
                </button>
              </div>
            </div>

            <p className="note" style={{ margin: "var(--space-3) 0 0" }}>
              {labels.flexNote} {labels.flexPriceNote}
            </p>
          </div>
        )}

        <div>
          <div className="panel">
            <h3>{labels.summaryTitle}</h3>
            {mode === "flexible" ? (
              <>
                <div className="summary-row">
                  <span>{labels.flexMonthLabel}</span>
                  <span className="value">{monthName(flexMonth)}</span>
                </div>
                <div className="summary-row">
                  <span>{labels.bookSlot}</span>
                  <span className="value">
                    {flexSlot === "day" ? labels.daySlot : labels.nightSlot} × {flexCount}
                  </span>
                </div>
                <div className="summary-row">
                  <span>{labels.bookPrice}</span>
                  <span className="value price-big">
                    {labels.fromWord} {flexFromPrice * flexCount} {currency}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="summary-row">
                  <span>{labels.bookDate}</span>
                  <span className="value" dir="ltr">
                    {datesValue}
                  </span>
                </div>
                <div className="summary-row">
                  <span>{labels.bookSlot}</span>
                  <span className="value">
                    {selection
                      ? `${selection.slot === "day" ? labels.daySlot : labels.nightSlot}`
                      : "—"}
                    {slotTimes && (
                      <>
                        {" "}
                        <span dir="ltr" style={{ color: "var(--color-text-muted)" }}>
                          {slotTimes}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="summary-row">
                  <span>{labels.bookPrice}</span>
                  <span className="value price-big">
                    {selection ? `${selection.total} ${currency}` : "—"}
                  </span>
                </div>
              </>
            )}
            {mode === "dates" && !selection && (
              <p className="summary-hint">{labels.selectSlotHint}</p>
            )}
            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: "var(--space-3)" }}
              disabled={mode === "dates" && !selection}
              onClick={proceed}
            >
              {labels.proceedPayment}
            </button>
          </div>

          <div className="panel">
            <p className="panel-label">{labels.includedTitle}</p>
            <ul className="included-list">
              {labels.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
