import { chaletConfig, SlotType } from "@/config/chalet.config";
import { getDb, BookingRow } from "@/lib/db";
import {
  addDays,
  isInSeason,
  isSlotInFuture,
  todayInChaletTz,
} from "@/lib/dates";
import { priceFor } from "@/lib/pricing";

/**
 * Availability engine. All rules are enforced server-side, inside SQLite
 * transactions:
 *
 *  1. Day and night slots on the same date are independent.
 *  2. A night booking on D blocks the day slot on D+1 (night guest stays
 *     until 17:00 on D+1).
 *  3. If the day slot on D+1 is booked, the night slot on D is blocked.
 *
 * "Live" bookings = confirmed bookings + unexpired payment holds.
 */

export type SlotState =
  | "available"
  | "booked" // this exact slot has a live booking
  | "blocked" // unavailable due to cross-day rule 2/3 or an owner block
  | "closed"; // out of season or in the past

export interface DaySlots {
  date: string;
  day: { state: SlotState; price: number };
  night: { state: SlotState; price: number };
}

/** Mark stale payment holds as expired. Call before any availability read/write. */
export function releaseExpiredHolds(): void {
  getDb()
    .prepare(
      `UPDATE bookings SET status='expired'
       WHERE status='hold' AND hold_expires_at IS NOT NULL AND hold_expires_at < ?`
    )
    .run(Date.now());
}

function liveBooking(
  date: string,
  slot: SlotType,
  excludeBookingId?: number
): BookingRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM bookings
       WHERE date=? AND slot=? AND status IN ('hold','confirmed') AND id != ?
       LIMIT 1`
    )
    .get(date, slot, excludeBookingId ?? -1) as BookingRow | undefined;
}

function isOwnerBlocked(date: string, slot: SlotType): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM blocked_dates WHERE date=? AND slot IN (?, 'both') LIMIT 1`
    )
    .get(date, slot);
  return !!row;
}

/**
 * State of one slot, applying season, past-date, owner blocks, direct
 * bookings, and the two cross-day rules. Assumes expired holds were released.
 * `excludeBookingId` ignores one booking in every check — used when moving a
 * booking, so the guest's own current booking doesn't block the target slot.
 */
export function slotState(
  date: string,
  slot: SlotType,
  excludeBookingId?: number
): SlotState {
  if (!isInSeason(date) || !isSlotInFuture(date, slot)) return "closed";
  if (isOwnerBlocked(date, slot)) return "blocked";
  if (liveBooking(date, slot, excludeBookingId)) return "booked";
  if (slot === "day") {
    // Rule 2: a night booking yesterday occupies the chalet until 17:00 today.
    if (liveBooking(addDays(date, -1), "night", excludeBookingId)) return "blocked";
  } else {
    // Rule 3: a day booking tomorrow means the night guest can't stay to 17:00.
    if (liveBooking(addDays(date, 1), "day", excludeBookingId)) return "blocked";
  }
  return "available";
}

export function isSlotBookable(
  date: string,
  slot: SlotType,
  excludeBookingId?: number
): boolean {
  return slotState(date, slot, excludeBookingId) === "available";
}

/**
 * Availability for every date of a month ("YYYY-MM"), for the calendar UI.
 */
export function monthAvailability(month: string): DaySlots[] {
  releaseExpiredHolds();
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: DaySlots[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out.push({
      date,
      day: { state: slotState(date, "day"), price: priceFor(date, "day") },
      night: { state: slotState(date, "night"), price: priceFor(date, "night") },
    });
  }
  return out;
}

/** First season month visible to guests: current month if in/before season, else next year's season start. */
export function defaultCalendarMonth(): string {
  const today = todayInChaletTz();
  const [y, m] = today.split("-").map(Number);
  const { startMonth, endMonth } = chaletConfig.season;
  if (m < startMonth) return `${y}-${String(startMonth).padStart(2, "0")}`;
  if (m > endMonth) return `${y + 1}-${String(startMonth).padStart(2, "0")}`;
  return `${y}-${String(m).padStart(2, "0")}`;
}
