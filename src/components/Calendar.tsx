"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
type SlotState = "available" | "booked" | "blocked" | "closed";
type DaySlots = {
  date: string;
  day: { state: SlotState; price: number };
  night: { state: SlotState; price: number };
};

export type CalendarLabels = Pick<
  Dictionary,
  | "nightSlot"
  | "legendAvailable"
  | "legendBooked"
  | "legendBlocked"
  | "legendClosed"
  | "prevMonth"
  | "nextMonth"
  | "loading"
>;

interface CalendarProps {
  locale: Locale;
  labels: CalendarLabels;
  currency: string;
  /** "YYYY-MM" the calendar opens on. */
  initialMonth: string;
  /** Earliest and latest navigable months, "YYYY-MM". */
  minMonth: string;
  maxMonth: string;
  /** Allow selecting a run of consecutive available dates (tap start, tap end). */
  rangeSelect?: boolean;
  /** Selection callback: one or more consecutive dates + their total price. */
  onSelect?: (dates: string[], slot: "day" | "night", total: number) => void;
  /** Currently selected dates (summary / rebook flow highlight). */
  selected?: { dates: string[]; slot: "day" | "night" } | null;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Night-availability calendar (day slots are phone-only and not sold on the
 * website). Each date shows one clear state for the night slot; the booking
 * engine's cross-day rules surface as "blocked" (e.g. a day booking made by
 * the owner blocks the previous night).
 */
export function Calendar({
  locale,
  labels,
  currency,
  initialMonth,
  minMonth,
  maxMonth,
  rangeSelect,
  onSelect,
  selected,
}: CalendarProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const view = "night" as const;
  const [cache, setCache] = useState<Record<string, DaySlots[]>>({});
  const days = cache[month];

  useEffect(() => {
    if (cache[month]) return;
    let cancelled = false;
    fetch(`/api/availability?month=${month}`)
      .then((r) => r.json())
      .then((data: { days: DaySlots[] }) => {
        if (!cancelled) setCache((c) => ({ ...c, [month]: data.days }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [month, cache]);

  const monthTitle = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  }, [month, locale]);

  // Week starts Monday; labels from Intl using a known Monday (2024-01-01).
  const dowLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))
    );
  }, [locale]);

  const leadingEmpty = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=Sun
    return (dow + 6) % 7; // Monday-based offset
  }, [month]);

  const handlePick = useCallback(
    (date: string, price: number) => {
      const monthDays = cache[month] ?? [];
      const emit = (dates: string[]) => {
        const total = dates.reduce((sum, dt) => {
          const row = monthDays.find((x) => x.date === dt);
          return sum + (row ? row[view].price : 0);
        }, 0);
        if (onSelect) onSelect(dates, view, total);
        else router.push(`/${locale}/book?dates=${dates.join(",")}&slot=${view}`);
      };

      if (!rangeSelect) {
        emit([date]);
        return;
      }
      // Range logic: first tap anchors; second tap extends when every date
      // between anchor and tap is available in this view. Anything else
      // restarts the selection at the tapped date.
      const current =
        selected && selected.slot === view && selected.dates.length === 1
          ? selected.dates[0]
          : null;
      if (!current || current === date) {
        emit([date]);
        return;
      }
      const [a, b] = date > current ? [current, date] : [date, current];
      const run = monthDays.filter((x) => x.date >= a && x.date <= b);
      const spanOk =
        run.length > 0 &&
        run[0].date === a &&
        run[run.length - 1].date === b &&
        run.every((x) => x[view].state === "available");
      if (spanOk) emit(run.map((x) => x.date));
      else emit([date]);
    },
    [onSelect, router, locale, view, rangeSelect, selected, cache, month]
  );

  const fmtNum = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={month <= minMonth}
          aria-label={labels.prevMonth}
        >
          <span className="arrow">‹</span>
        </button>
        <h3>{monthTitle}</h3>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          disabled={month >= maxMonth}
          aria-label={labels.nextMonth}
        >
          <span className="arrow">›</span>
        </button>
      </div>

      {!days ? (
        <p style={{ textAlign: "center" }}>
          <span className="spinner" /> {labels.loading}
        </p>
      ) : (
        <div className="calendar-grid">
          {dowLabels.map((d, i) => (
            <div key={i} className="calendar-dow">
              {d}
            </div>
          ))}
          {Array.from({ length: leadingEmpty }, (_, i) => (
            <div key={`e${i}`} className="cal-cell is-empty" />
          ))}
          {days.map((d) => {
            const info = d[view];
            const isSelected =
              selected && selected.slot === view && selected.dates.includes(d.date);
            const bookable = info.state === "available";
            const stateLabel =
              info.state === "available"
                ? labels.legendAvailable
                : info.state === "booked"
                  ? labels.legendBooked
                  : info.state === "blocked"
                    ? labels.legendBlocked
                    : labels.legendClosed;
            return (
              <button
                key={d.date}
                type="button"
                className={`cal-cell ${info.state}${isSelected ? " selected" : ""}`}
                disabled={!bookable}
                onClick={() => bookable && handlePick(d.date, info.price)}
                aria-label={`${d.date} — ${stateLabel}${bookable ? ` — ${info.price} ${currency}` : ""}`}
                title={`${stateLabel}${bookable ? ` · ${info.price} ${currency}` : ""}`}
              >
                <span className="cal-num">{fmtNum.format(Number(d.date.slice(8)))}</span>
                {bookable && <span className="cal-price">{fmtNum.format(info.price)}</span>}
                {(info.state === "booked" || info.state === "blocked") && (
                  <span className="cal-state">{stateLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="calendar-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--color-available)" }} />
          {labels.legendAvailable}
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--color-booked)" }} />
          {labels.legendBooked}
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--color-blocked)" }} />
          {labels.legendBlocked}
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--color-closed)" }} />
          {labels.legendClosed}
        </span>
      </div>
    </div>
  );
}
