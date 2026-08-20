"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chaletConfig } from "@/config/chalet.config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Calendar, type CalendarLabels } from "@/components/Calendar";

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
  > & { included: string[] };

/**
 * The design's booking layout: calendar on one side, a Booking Summary card
 * plus "What's included" panel on the other. Selecting a slot fills the
 * summary; Proceed to payment goes to the booking form page.
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
  const [selection, setSelection] = useState<{
    date: string;
    slot: "day" | "night";
    price: number;
  } | null>(null);

  const slotCfg = selection ? chaletConfig.slots[selection.slot] : null;
  const slotTimes = slotCfg
    ? slotCfg.endsNextDay
      ? `${slotCfg.start} → ${slotCfg.end} (${labels.nextDayShort})`
      : `${slotCfg.start} → ${slotCfg.end}`
    : null;

  return (
    <div className="book-grid">
      <Calendar
        locale={locale}
        labels={labels}
        currency={currency}
        initialMonth={initialMonth}
        minMonth={minMonth}
        maxMonth={maxMonth}
        onSelect={(date, slot, price) => setSelection({ date, slot, price })}
        selected={selection}
      />

      <div>
        <div className="panel">
          <h3>{labels.summaryTitle}</h3>
          <div className="summary-row">
            <span>{labels.bookDate}</span>
            <span className="value">{selection ? selection.date : "—"}</span>
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
              {selection ? `${selection.price} ${currency}` : "—"}
            </span>
          </div>
          {!selection && <p className="summary-hint">{labels.selectSlotHint}</p>}
          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: "var(--space-3)" }}
            disabled={!selection}
            onClick={() =>
              selection &&
              router.push(
                `/${locale}/book?date=${selection.date}&slot=${selection.slot}`
              )
            }
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
  );
}
