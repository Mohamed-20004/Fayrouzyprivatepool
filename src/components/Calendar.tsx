"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { IconMoon, IconSun } from "@/components/Icons";

type SlotState = "available" | "booked" | "blocked" | "closed";
type DaySlots = {
  date: string;
  day: { state: SlotState; price: number };
  night: { state: SlotState; price: number };
};

export type CalendarLabels = Pick<
  Dictionary,
  | "daySlot"
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
  /** When set, slot clicks call this instead of navigating to the booking page. */
  onSelect?: (date: string, slot: "day" | "night", price: number) => void;
  /** Currently selected slot (summary / rebook flow highlight). */
  selected?: { date: string; slot: "day" | "night" } | null;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Availability calendar. Day and night bookings are separate views — the
 * segmented toggle switches between them, and each date shows one clear
 * state for the chosen slot type. Cross-day rules from the booking engine
 * surface here as "blocked" (e.g. a night booking blocks the next day's
 * day slot until 17:00).
 */
export function Calendar({
  locale,
  labels,
  currency,
  initialMonth,
  minMonth,
  maxMonth,
  onSelect,
  selected,
}: CalendarProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [view, setView] = useState<"day" | "night">("day");
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
      if (onSelect) onSelect(date, view, price);
      else router.push(`/${locale}/book?date=${date}&slot=${view}`);
    },
    [onSelect, router, locale, view]
  );

  const fmtNum = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <div className="calendar">
      <div className="cal-toggle" role="tablist" aria-label={`${labels.daySlot} / ${labels.nightSlot}`}>
        <button
          type="button"
          role="tab"
          aria-selected={view === "day"}
          className={view === "day" ? "active" : ""}
          onClick={() => setView("day")}
        >
          <IconSun size={15} /> {labels.daySlot}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "night"}
          className={view === "night" ? "active" : ""}
          onClick={() => setView("night")}
        >
          <IconMoon size={15} /> {labels.nightSlot}
        </button>
      </div>

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
              selected && selected.date === d.date && selected.slot === view;
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
