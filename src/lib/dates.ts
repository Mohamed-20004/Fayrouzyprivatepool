import { chaletConfig, SlotType } from "@/config/chalet.config";

/**
 * Date helpers. Bookings are keyed by calendar date strings ("YYYY-MM-DD")
 * in the chalet's local timezone — never by timestamps — so all of these
 * operate on date strings and only touch real Date objects when a concrete
 * instant is needed (e.g. the 7-day refund cutoff).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** 0=Sunday … 6=Saturday for a YYYY-MM-DD string. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekend(dateStr: string): boolean {
  return (chaletConfig.weekendDays as readonly number[]).includes(
    dayOfWeek(dateStr)
  );
}

/** Offset of `tz` from UTC (ms) at a given instant. */
function tzOffsetMs(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - at.getTime();
}

/** Convert a local date+time in the chalet timezone to a UTC instant. */
export function zonedToUtc(dateStr: string, timeStr: string): Date {
  const tz = chaletConfig.timezone;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes to converge across DST transitions.
  let offset = tzOffsetMs(tz, new Date(guess));
  offset = tzOffsetMs(tz, new Date(guess - offset));
  return new Date(guess - offset);
}

/** Today's date string in the chalet's timezone. */
export function todayInChaletTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: chaletConfig.timezone,
  }).format(new Date());
}

/** The UTC instant at which a booked slot starts. */
export function slotStartUtc(dateStr: string, slot: SlotType): Date {
  return zonedToUtc(dateStr, chaletConfig.slots[slot].start);
}

/** The UTC instant at which a booked slot ends. */
export function slotEndUtc(dateStr: string, slot: SlotType): Date {
  const cfg = chaletConfig.slots[slot];
  const endDate = cfg.endsNextDay ? addDays(dateStr, 1) : dateStr;
  return zonedToUtc(endDate, cfg.end);
}

/** True when the date falls inside the bookable season (any year). */
export function isInSeason(dateStr: string): boolean {
  const [, m, d] = dateStr.split("-").map(Number);
  const { startMonth, startDay, endMonth, endDay } = chaletConfig.season;
  const v = m * 100 + d;
  return v >= startMonth * 100 + startDay && v <= endMonth * 100 + endDay;
}

/** Whether the slot can still be booked today (its start has not passed). */
export function isSlotInFuture(dateStr: string, slot: SlotType): boolean {
  return slotStartUtc(dateStr, slot).getTime() > Date.now();
}

/** Days (fractional) from now until the slot starts. Used for the 7-day rule. */
export function daysUntilSlotStart(dateStr: string, slot: SlotType): number {
  return (slotStartUtc(dateStr, slot).getTime() - Date.now()) / 86_400_000;
}

/** True when the booking may still be cancelled/rebooked with a full refund. */
export function isFreelyChangeable(dateStr: string, slot: SlotType): boolean {
  return daysUntilSlotStart(dateStr, slot) >= chaletConfig.freeCancellationDays;
}
