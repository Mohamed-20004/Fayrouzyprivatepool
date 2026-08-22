"use client";

import { useEffect, useState } from "react";
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
    | "modeFlexible"
    | "flexNightsShort"
    | "flexNote"
    | "flexShuffle"
    | "rangeHint"
    | "errNoAvailability"
    | "loading"
  > & { included: string[] };

type FlexState = "idle" | "loading" | "none" | "picked";

/**
 * Night-booking layout: one calendar for both flows. Guests either tap a
 * start/end date themselves, or switch on Flexible under the calendar —
 * they pick a number of nights, the system assigns a random available run
 * in the month they're viewing and highlights it on the calendar exactly
 * like a manual selection, with a re-roll button. Tapping a date while
 * Flexible is on switches back to manual picking.
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
    dates: string[];
    slot: "day" | "night";
    total: number;
  } | null>(null);
  const [flexOn, setFlexOn] = useState(false);
  const [flexCount, setFlexCount] = useState(1);
  const [flexState, setFlexState] = useState<FlexState>("idle");
  const [calMonth, setCalMonth] = useState(initialMonth);
  const [shuffle, setShuffle] = useState(0);

  // While Flexible is on, (re)pick a run whenever the viewed month, the
  // night count, or the re-roll counter changes.
  useEffect(() => {
    if (!flexOn) return;
    let cancelled = false;
    setFlexState("loading");
    fetch(`/api/flexible?month=${calMonth}&count=${flexCount}`)
      .then(async (r) =>
        r.ok ? ((await r.json()) as { dates: string[]; total: number }) : null
      )
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setFlexState("picked");
          setSelection({ dates: data.dates, slot: "night", total: data.total });
        } else {
          setFlexState("none");
          setSelection(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFlexState("none");
          setSelection(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [flexOn, calMonth, flexCount, shuffle]);

  function toggleFlex() {
    const next = !flexOn;
    setFlexOn(next);
    if (!next) setFlexState("idle");
  }

  function handleManualSelect(dates: string[], slot: "day" | "night", total: number) {
    if (flexOn) {
      setFlexOn(false);
      setFlexState("idle");
    }
    setSelection({ dates, slot, total });
  }

  const slotCfg = chaletConfig.slots.night;
  const slotTimes = `${slotCfg.start} → ${slotCfg.end} (${labels.nextDayShort})`;

  const rangeLabel = (dates: string[]) =>
    dates.length === 1
      ? dates[0]
      : `${dates[0]} → ${dates[dates.length - 1]} (×${dates.length})`;

  function proceed() {
    if (!selection) return;
    router.push(`/${locale}/book?dates=${selection.dates.join(",")}&slot=night`);
  }

  const hint = flexOn
    ? flexState === "loading"
      ? labels.loading
      : flexState === "none"
        ? labels.errNoAvailability
        : labels.flexNote
    : labels.rangeHint;

  return (
    <div className="book-grid">
      <div>
        <Calendar
          locale={locale}
          labels={labels}
          currency={currency}
          initialMonth={initialMonth}
          minMonth={minMonth}
          maxMonth={maxMonth}
          rangeSelect
          onSelect={handleManualSelect}
          selected={selection}
          onMonthChange={setCalMonth}
        />

        <div className="flex-bar">
          <button
            type="button"
            className={`flex-switch${flexOn ? " active" : ""}`}
            aria-pressed={flexOn}
            onClick={toggleFlex}
          >
            <span className="track" aria-hidden />
            {labels.modeFlexible}
          </button>
          {flexOn && (
            <>
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
              <span className="flex-nights">{labels.flexNightsShort}</span>
              <button
                type="button"
                className="btn btn-secondary flex-shuffle"
                onClick={() => setShuffle((n) => n + 1)}
                disabled={flexState === "loading"}
              >
                ↻ {labels.flexShuffle}
              </button>
            </>
          )}
        </div>

        <p
          className={
            flexOn && flexState === "none" ? "compare-hint error" : "compare-hint"
          }
          style={{ marginTop: "var(--space-2)" }}
        >
          {hint}
        </p>
      </div>

      <div>
        <div className="panel">
          <h3>{labels.summaryTitle}</h3>
          <div className="summary-row">
            <span>{labels.bookDate}</span>
            <span className="value" dir="ltr">
              {selection ? rangeLabel(selection.dates) : "—"}
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
              {selection ? `${selection.total} ${currency}` : "—"}
            </span>
          </div>
          {!selection && <p className="summary-hint">{labels.selectSlotHint}</p>}
          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: "var(--space-3)" }}
            disabled={!selection}
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
  );
}
