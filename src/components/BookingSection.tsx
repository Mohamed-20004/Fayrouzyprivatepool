"use client";

import { useEffect, useMemo, useState } from "react";
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
    | "modeSpecific"
    | "modeFlexible"
    | "flexMonthLabel"
    | "flexCountNights"
    | "flexNote"
    | "flexShuffle"
    | "rangeHint"
    | "errNoAvailability"
    | "loading"
  > & { included: string[] };

type FlexPick = { dates: string[]; total: number } | "none" | "loading";

/**
 * Night-booking layout: calendar with consecutive-range selection, or the
 * Flexible panel — guests pick a month and a number of nights, see exactly
 * which dates were assigned (with a re-roll button), then book those dates
 * through the normal flow.
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
  const [flexCount, setFlexCount] = useState(1);
  const [flexPick, setFlexPick] = useState<FlexPick>("loading");
  const [shuffle, setShuffle] = useState(0);

  // Fetch a random suggestion whenever the flexible inputs (or re-roll) change.
  useEffect(() => {
    if (mode !== "flexible") return;
    let cancelled = false;
    setFlexPick("loading");
    fetch(`/api/flexible?month=${flexMonth}&count=${flexCount}`)
      .then(async (r) =>
        r.ok ? ((await r.json()) as { dates: string[]; total: number }) : "none"
      )
      .then((data) => {
        if (!cancelled) setFlexPick(data === "none" ? "none" : data);
      })
      .catch(() => {
        if (!cancelled) setFlexPick("none");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, flexMonth, flexCount, shuffle]);

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

  const slotCfg = chaletConfig.slots.night;
  const slotTimes = `${slotCfg.start} → ${slotCfg.end} (${labels.nextDayShort})`;

  const rangeLabel = (dates: string[]) =>
    dates.length === 1
      ? dates[0]
      : `${dates[0]} → ${dates[dates.length - 1]} (×${dates.length})`;

  const activeDates =
    mode === "flexible"
      ? typeof flexPick === "object"
        ? flexPick.dates
        : null
      : (selection?.dates ?? null);
  const activeTotal =
    mode === "flexible"
      ? typeof flexPick === "object"
        ? flexPick.total
        : null
      : (selection?.total ?? null);

  function proceed() {
    if (!activeDates) return;
    router.push(`/${locale}/book?dates=${activeDates.join(",")}&slot=night`);
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
              <label>{labels.flexCountNights}</label>
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

            {flexPick === "loading" ? (
              <p style={{ margin: "var(--space-3) 0 0" }}>
                <span className="spinner" /> {labels.loading}
              </p>
            ) : flexPick === "none" ? (
              <p className="error" style={{ margin: "var(--space-3) 0 0" }}>
                {labels.errNoAvailability}
              </p>
            ) : (
              <>
                <p className="note" style={{ margin: "var(--space-3) 0" }}>
                  {labels.flexNote}
                </p>
                <div className="summary-row">
                  <span>{labels.bookDate}</span>
                  <span className="value" dir="ltr">
                    {rangeLabel(flexPick.dates)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "100%", marginTop: "var(--space-3)" }}
                  onClick={() => setShuffle((n) => n + 1)}
                >
                  ↻ {labels.flexShuffle}
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <div className="panel">
            <h3>{labels.summaryTitle}</h3>
            <div className="summary-row">
              <span>{labels.bookDate}</span>
              <span className="value" dir="ltr">
                {activeDates ? rangeLabel(activeDates) : "—"}
              </span>
            </div>
            <div className="summary-row">
              <span>{labels.bookSlot}</span>
              <span className="value">
                {labels.nightSlot}{" "}
                <span dir="ltr" style={{ color: "var(--color-text-muted)" }}>
                  {slotTimes}
                </span>
              </span>
            </div>
            <div className="summary-row">
              <span>{labels.bookPrice}</span>
              <span className="value price-big">
                {activeTotal !== null ? `${activeTotal} ${currency}` : "—"}
              </span>
            </div>
            {mode === "dates" && !selection && (
              <p className="summary-hint">{labels.selectSlotHint}</p>
            )}
            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: "var(--space-3)" }}
              disabled={!activeDates}
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
