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
  /** Currently selected slot (rebook flow highlight). */
  selected?: { date: string; slot: "day" | "night" } | null;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

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

  const handleClick = useCallback(
    (date: string, slot: "day" | "night", price: number) => {
      if (onSelect) onSelect(date, slot, price);
      else router.push(`/${locale}/book?date=${date}&slot=${slot}`);
    },
    [onSelect, router, locale]
  );

  const dayNum = (date: string) =>
    new Intl.NumberFormat(locale).format(Number(date.slice(8)));

  function chip(d: DaySlots, slot: "day" | "night") {
    const info = d[slot];
    const isSelected =
      selected && selected.date === d.date && selected.slot === slot;
    const icon = slot === "day" ? "☀" : "🌙";
    const label = slot === "day" ? labels.daySlot : labels.nightSlot;
    const clickable = info.state === "available";
    return (
      <button
        type="button"
        className={`slot-chip ${info.state}`}
        style={isSelected ? { outline: "2px solid var(--brand-primary)" } : undefined}
        disabled={!clickable}
        onClick={() => clickable && handleClick(d.date, slot, info.price)}
        aria-label={`${d.date} ${label}: ${info.state}`}
        title={`${label} — ${info.state === "available" ? `${info.price} ${currency}` : info.state}`}
      >
        <span className="slot-icon" aria-hidden="true">
          {icon}
        </span>
        {info.state === "available" ? `${info.price}` : "—"}
      </button>
    );
  }

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
            <div key={`e${i}`} className="calendar-cell is-empty" />
          ))}
          {days.map((d) => {
            const allClosed =
              d.day.state === "closed" && d.night.state === "closed";
            return (
              <div
                key={d.date}
                className={`calendar-cell${allClosed ? " all-closed" : ""}`}
              >
                <div className="date-num">{dayNum(d.date)}</div>
                {!allClosed && (
                  <>
                    {chip(d, "day")}
                    {chip(d, "night")}
                  </>
                )}
              </div>
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
