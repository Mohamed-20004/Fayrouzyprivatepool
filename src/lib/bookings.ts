import crypto from "node:crypto";
import { chaletConfig, SlotType } from "@/config/chalet.config";
import { getDb, BookingRow, PaymentRow } from "@/lib/db";
import {
  isSlotBookable,
  releaseExpiredHolds,
  slotState,
} from "@/lib/availability";
import {
  addDays,
  isFreelyChangeable,
  isValidDateStr,
  todayInChaletTz,
} from "@/lib/dates";
import { priceFor } from "@/lib/pricing";
import { newBookingReference } from "@/lib/reference";
import { getProvider } from "@/lib/payments";
import type { ProviderId } from "@/lib/payments/types";
import {
  sendBookingConfirmation,
  sendCancellationConfirmation,
  sendPaymentFailed,
} from "@/lib/whatsapp/messages";

/**
 * Booking lifecycle. A booking is a GROUP of one or more consecutive dates
 * of the same slot type, paid together and sharing a guest-facing
 * `group_ref`. Every state change that touches slot occupancy runs in a
 * better-sqlite3 transaction; a partial unique index on (date, slot) over
 * live rows is the last line of defence against double-booking.
 */

export const MAX_GROUP_DAYS = 14;
export const MAX_FLEX_DAYS = 7;

export type CreateHoldInput = {
  /** Consecutive ascending dates, all booked as `slot`. */
  dates: string[];
  slot: SlotType;
  guestName: string;
  whatsapp: string;
  locale: string;
  provider: ProviderId;
  /** 'full' pays everything online; 'deposit' pays depositPercent online. */
  plan: "full" | "deposit";
};

export type CreateHoldResult =
  | {
      ok: true;
      reference: string;
      checkoutUrl: string;
      /** Charged online now (the deposit when plan = 'deposit'). */
      amount: number;
      /** Full price of the stay. */
      total: number;
      dates: string[];
    }
  | { ok: false; error: string };

const E164_RE = /^\+[1-9]\d{6,14}$/;

export function normalizeWhatsApp(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, "");
  const withPlus = cleaned.startsWith("00")
    ? `+${cleaned.slice(2)}`
    : cleaned;
  return E164_RE.test(withPlus) ? withPlus : null;
}

export function baseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function areConsecutiveDates(dates: string[]): boolean {
  if (dates.length === 0) return false;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] !== addDays(dates[i - 1], 1)) return false;
  }
  return true;
}

class HoldError extends Error {}

/** Place a 10-minute hold on 1..MAX_GROUP_DAYS consecutive slots + checkout. */
export async function createBookingHold(
  input: CreateHoldInput
): Promise<CreateHoldResult> {
  const db = getDb();

  if (
    !Array.isArray(input.dates) ||
    input.dates.length < 1 ||
    input.dates.length > MAX_GROUP_DAYS ||
    !input.dates.every(isValidDateStr) ||
    !areConsecutiveDates(input.dates)
  ) {
    return { ok: false, error: "invalid_dates" };
  }
  if (input.slot !== "day" && input.slot !== "night")
    return { ok: false, error: "invalid_slot" };
  const guestName = input.guestName.trim();
  if (guestName.length < 2 || guestName.length > 100)
    return { ok: false, error: "invalid_name" };
  const whatsapp = normalizeWhatsApp(input.whatsapp);
  if (!whatsapp) return { ok: false, error: "invalid_whatsapp" };
  const provider = getProvider(input.provider);
  if (!provider) return { ok: false, error: "invalid_provider" };
  const plan = input.plan === "deposit" ? "deposit" : "full";

  const amounts = input.dates.map((d) => priceFor(d, input.slot));
  const total = amounts.reduce((a, b) => a + b, 0);
  const charge =
    plan === "deposit"
      ? Math.ceil((total * chaletConfig.depositPercent) / 100)
      : total;
  const groupRef = newBookingReference();
  const providerRef = crypto.randomUUID();
  const now = Date.now();

  let leadId: number;
  try {
    leadId = db.transaction(() => {
      releaseExpiredHolds();
      for (const date of input.dates) {
        if (!isSlotBookable(date, input.slot)) {
          throw new HoldError("slot_unavailable");
        }
      }
      const insert = db.prepare(
        `INSERT INTO bookings
           (reference, group_ref, payment_plan, date, slot, status, guest_name,
            whatsapp, locale, amount, currency, payment_provider,
            hold_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'hold', ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      let firstId = 0;
      input.dates.forEach((date, i) => {
        const rowRef = i === 0 ? groupRef : `${groupRef}~${i}`;
        const res = insert.run(
          rowRef,
          groupRef,
          plan,
          date,
          input.slot,
          guestName,
          whatsapp,
          input.locale,
          amounts[i],
          chaletConfig.currency,
          provider.id,
          now + chaletConfig.holdMinutes * 60_000,
          now
        );
        if (i === 0) firstId = Number(res.lastInsertRowid);
      });
      db.prepare(
        `INSERT INTO payments
           (booking_id, purpose, provider, provider_ref, amount, currency,
            status, created_at, updated_at)
         VALUES (?, 'booking', ?, ?, ?, ?, 'pending', ?, ?)`
      ).run(firstId, provider.id, providerRef, charge, chaletConfig.currency, now, now);
      return firstId;
    })();
  } catch (e) {
    if (e instanceof HoldError) return { ok: false, error: e.message };
    throw e;
  }
  void leadId;

  const rangeLabel =
    input.dates.length === 1
      ? input.dates[0]
      : `${input.dates[0]} → ${input.dates[input.dates.length - 1]}`;
  try {
    const session = await provider.createCheckout({
      providerRef,
      amount: charge,
      currency: chaletConfig.currency,
      description: `${chaletConfig.name} — ${rangeLabel} ${input.slot} (${groupRef}${plan === "deposit" ? ", deposit" : ""})`,
      returnUrl: `${baseUrl()}/${input.locale}/confirmation/${groupRef}`,
      webhookUrl: `${baseUrl()}/api/payments/webhook/${provider.id}`,
    });
    return {
      ok: true,
      reference: groupRef,
      checkoutUrl: session.checkoutUrl,
      amount: charge,
      total,
      dates: input.dates,
    };
  } catch {
    db.prepare(
      `UPDATE bookings SET status='expired' WHERE group_ref=? AND status='hold'`
    ).run(groupRef);
    db.prepare(
      `UPDATE payments SET status='failed', updated_at=? WHERE provider_ref=?`
    ).run(Date.now(), providerRef);
    return { ok: false, error: "checkout_failed" };
  }
}

/**
 * Flexible booking: the guest picks only a month, slot type and a number of
 * consecutive days — the chalet assigns a random available run in that
 * month, then the normal hold flow takes over.
 */
export async function createFlexibleHold(
  input: Omit<CreateHoldInput, "dates"> & { month: string; count: number }
): Promise<CreateHoldResult> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month))
    return { ok: false, error: "invalid_month" };
  const count = Math.floor(input.count);
  if (!(count >= 1 && count <= MAX_FLEX_DAYS))
    return { ok: false, error: "invalid_count" };

  const [y, m] = input.month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayInChaletTz();

  releaseExpiredHolds();
  const candidates: string[] = [];
  for (let d = 1; d <= daysInMonth - (count - 1); d++) {
    const start = `${input.month}-${String(d).padStart(2, "0")}`;
    if (start < today) continue;
    let ok = true;
    for (let i = 0; i < count; i++) {
      if (slotState(addDays(start, i), input.slot) !== "available") {
        ok = false;
        break;
      }
    }
    if (ok) candidates.push(start);
  }
  if (candidates.length === 0) return { ok: false, error: "no_availability" };

  // Try random starts until a hold sticks (a candidate can be taken between
  // the scan and the hold — the transactional hold is still the authority).
  const shuffled = candidates
    .map((c) => ({ c, r: crypto.randomInt(1 << 30) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.c);
  for (const start of shuffled.slice(0, 5)) {
    const dates = Array.from({ length: count }, (_, i) => addDays(start, i));
    const result = await createBookingHold({ ...input, dates });
    if (result.ok || result.error !== "slot_unavailable") return result;
  }
  return { ok: false, error: "no_availability" };
}

/** All rows of a booking group, ascending by date. */
export function getBookingGroup(groupRef: string): BookingRow[] {
  return getDb()
    .prepare(`SELECT * FROM bookings WHERE group_ref=? ORDER BY date`)
    .all(groupRef) as BookingRow[];
}

/**
 * Apply an authenticated payment webhook result. Idempotent: replayed
 * webhooks for an already-settled payment are no-ops.
 */
export async function applyPaymentResult(
  providerRef: string,
  status: "paid" | "failed"
): Promise<void> {
  const db = getDb();
  const payment = db
    .prepare(`SELECT * FROM payments WHERE provider_ref=?`)
    .get(providerRef) as PaymentRow | undefined;
  if (!payment || payment.status !== "pending") return;

  if (payment.purpose === "rebook_difference") {
    await applyRebookPaymentResult(payment, status);
    return;
  }

  const lead = db
    .prepare(`SELECT * FROM bookings WHERE id=?`)
    .get(payment.booking_id) as BookingRow;
  const now = Date.now();
  type Outcome = "confirmed" | "failed" | "refund_needed";

  const outcome = db.transaction((): Outcome => {
    db.prepare(`UPDATE payments SET status=?, updated_at=? WHERE id=?`).run(
      status === "paid" ? "paid" : "failed",
      now,
      payment.id
    );
    const rows = db
      .prepare(`SELECT * FROM bookings WHERE group_ref=? ORDER BY date`)
      .all(lead.group_ref) as BookingRow[];

    if (status === "failed") {
      db.prepare(
        `UPDATE bookings SET status='expired' WHERE group_ref=? AND status='hold'`
      ).run(lead.group_ref);
      return "failed";
    }

    if (rows.every((r) => r.status === "confirmed")) return "confirmed"; // duplicate
    if (!rows.every((r) => r.status === "hold")) return "refund_needed"; // partially lost

    const holdExpired = rows.some(
      (r) => r.hold_expires_at !== null && r.hold_expires_at < now
    );
    if (holdExpired) {
      // Late webhook: release the lapsed holds, then re-check every date.
      db.prepare(
        `UPDATE bookings SET status='expired' WHERE group_ref=?`
      ).run(lead.group_ref);
      releaseExpiredHolds();
      for (const r of rows) {
        if (slotState(r.date, r.slot) !== "available") return "refund_needed";
      }
    }
    db.prepare(
      `UPDATE bookings SET status='confirmed', confirmed_at=?, payment_ref=? WHERE group_ref=?`
    ).run(now, providerRef, lead.group_ref);
    return "confirmed";
  })();

  const rows = getBookingGroup(lead.group_ref);
  if (outcome === "confirmed") {
    await sendBookingConfirmation(rows);
  } else if (outcome === "refund_needed") {
    await refundPayment(payment, payment.amount);
    await sendPaymentFailed(rows[0], "slot_lost");
  } else {
    await sendPaymentFailed(rows[0], "payment_failed");
  }
}

async function refundPayment(payment: PaymentRow, amount: number): Promise<boolean> {
  const provider = getProvider(payment.provider);
  if (!provider) return false;
  const result = await provider.refund(payment.provider_ref, amount, payment.currency);
  if (result.ok) {
    getDb()
      .prepare(`UPDATE payments SET status=?, updated_at=? WHERE id=?`)
      .run(
        amount >= payment.amount ? "refunded" : "partially_refunded",
        Date.now(),
        payment.id
      );
    getDb()
      .prepare(`UPDATE bookings SET refund_ref=? WHERE id=?`)
      .run(result.refundRef ?? null, payment.booking_id);
  }
  return result.ok;
}

export type CancelResult =
  | { ok: true; refunded: boolean }
  | { ok: false; error: "not_found" | "not_cancellable" | "too_late" };

/**
 * Cancel a confirmed booking group. Only allowed while the FIRST date's slot
 * start is ≥7 days away (enforced here regardless of what UI/button
 * triggered it). Frees every slot and refunds all captured payments.
 */
export async function cancelBooking(groupRef: string): Promise<CancelResult> {
  const db = getDb();
  const rows = getBookingGroup(groupRef);
  if (rows.length === 0) return { ok: false, error: "not_found" };
  if (!rows.every((r) => r.status === "confirmed"))
    return { ok: false, error: "not_cancellable" };
  if (!isFreelyChangeable(rows[0].date, rows[0].slot))
    return { ok: false, error: "too_late" };

  const changed = db
    .prepare(
      `UPDATE bookings SET status='cancelled', cancelled_at=? WHERE group_ref=? AND status='confirmed'`
    )
    .run(Date.now(), groupRef).changes;
  if (!changed) return { ok: false, error: "not_cancellable" };

  const ids = rows.map((r) => r.id);
  const paid = db
    .prepare(
      `SELECT * FROM payments WHERE booking_id IN (${ids.map(() => "?").join(",")}) AND status='paid'`
    )
    .all(...ids) as PaymentRow[];
  let refunded = paid.length > 0;
  for (const p of paid) {
    const ok = await refundPayment(p, p.amount);
    refunded = refunded && ok;
  }

  await sendCancellationConfirmation(
    rows.map((r) => ({ ...r, status: "cancelled" as const })),
    refunded
  );
  return { ok: true, refunded };
}

export type RebookResult =
  | { ok: true; kind: "moved"; reference: string; refundedDifference: number }
  | { ok: true; kind: "payment_required"; checkoutUrl: string; difference: number }
  | {
      ok: false;
      error:
        | "not_found"
        | "not_confirmed"
        | "not_rebookable"
        | "too_late"
        | "slot_unavailable"
        | "same_slot"
        | "invalid_date"
        | "checkout_failed";
    };

/**
 * Move a single-day confirmed booking to a new available slot. Multi-day
 * groups are not reschedulable online (the guest calls the chalet).
 * Cheaper/equal slot → move immediately, refund the difference (per config).
 * Dearer slot → hold the new slot, require the difference via checkout.
 */
export async function rebookBooking(
  groupRef: string,
  newDate: string,
  newSlot: SlotType
): Promise<RebookResult> {
  const db = getDb();
  if (!isValidDateStr(newDate) || (newSlot !== "day" && newSlot !== "night"))
    return { ok: false, error: "invalid_date" };

  const rows = getBookingGroup(groupRef);
  if (rows.length === 0) return { ok: false, error: "not_found" };
  if (rows.length > 1) return { ok: false, error: "not_rebookable" };
  const booking = rows[0];
  if (booking.payment_plan === "deposit")
    return { ok: false, error: "not_rebookable" };
  if (booking.status !== "confirmed") return { ok: false, error: "not_confirmed" };
  if (!isFreelyChangeable(booking.date, booking.slot))
    return { ok: false, error: "too_late" };
  if (booking.date === newDate && booking.slot === newSlot)
    return { ok: false, error: "same_slot" };

  const newPrice = priceFor(newDate, newSlot);
  const difference = newPrice - booking.amount;

  if (difference <= 0) {
    try {
      db.transaction(() => {
        releaseExpiredHolds();
        if (!isSlotBookable(newDate, newSlot, booking.id))
          throw new HoldError("slot_unavailable");
        db.prepare(
          `UPDATE bookings SET date=?, slot=?, amount=? WHERE id=? AND status='confirmed'`
        ).run(
          newDate,
          newSlot,
          chaletConfig.rebookPriceDifference === "settleDifference"
            ? newPrice
            : booking.amount,
          booking.id
        );
      })();
    } catch (e) {
      if (e instanceof HoldError) return { ok: false, error: "slot_unavailable" };
      throw e;
    }

    let refundedDifference = 0;
    if (difference < 0 && chaletConfig.rebookPriceDifference === "settleDifference") {
      const paid = db
        .prepare(
          `SELECT * FROM payments WHERE booking_id=? AND purpose='booking' AND status='paid'`
        )
        .get(booking.id) as PaymentRow | undefined;
      if (paid && (await refundPayment(paid, -difference))) {
        refundedDifference = -difference;
      }
    }

    await sendBookingConfirmation(getBookingGroup(groupRef), { rebooked: true });
    return { ok: true, kind: "moved", reference: groupRef, refundedDifference };
  }

  // Dearer slot: hold it under a temporary row and charge the difference.
  const provider = getProvider(booking.payment_provider || "whish")!;
  const providerRef = crypto.randomUUID();
  const tempReference = `${groupRef}~R${Date.now().toString(36).toUpperCase()}`;
  const now = Date.now();

  try {
    db.transaction(() => {
      releaseExpiredHolds();
      if (!isSlotBookable(newDate, newSlot, booking.id))
        throw new HoldError("slot_unavailable");
      const res = db
        .prepare(
          `INSERT INTO bookings
             (reference, group_ref, date, slot, status, guest_name, whatsapp,
              locale, amount, currency, payment_provider, hold_expires_at, created_at)
           VALUES (?, ?, ?, ?, 'hold', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          tempReference,
          tempReference,
          newDate,
          newSlot,
          booking.guest_name,
          booking.whatsapp,
          booking.locale,
          newPrice,
          booking.currency,
          provider.id,
          now + chaletConfig.holdMinutes * 60_000,
          now
        );
      db.prepare(
        `INSERT INTO payments
           (booking_id, purpose, provider, provider_ref, amount, currency,
            status, meta, created_at, updated_at)
         VALUES (?, 'rebook_difference', ?, ?, ?, ?, 'pending', ?, ?, ?)`
      ).run(
        Number(res.lastInsertRowid),
        provider.id,
        providerRef,
        difference,
        booking.currency,
        JSON.stringify({ originalBookingId: booking.id, originalReference: groupRef }),
        now,
        now
      );
    })();
  } catch (e) {
    if (e instanceof HoldError) return { ok: false, error: "slot_unavailable" };
    throw e;
  }

  try {
    const session = await provider.createCheckout({
      providerRef,
      amount: difference,
      currency: booking.currency,
      description: `${chaletConfig.name} — rebook ${groupRef} to ${newDate} ${newSlot}`,
      returnUrl: `${baseUrl()}/${booking.locale}/confirmation/${groupRef}`,
      webhookUrl: `${baseUrl()}/api/payments/webhook/${provider.id}`,
    });
    return { ok: true, kind: "payment_required", checkoutUrl: session.checkoutUrl, difference };
  } catch {
    db.prepare(
      `UPDATE bookings SET status='expired' WHERE reference=? AND status='hold'`
    ).run(tempReference);
    db.prepare(
      `UPDATE payments SET status='failed', updated_at=? WHERE provider_ref=?`
    ).run(Date.now(), providerRef);
    return { ok: false, error: "checkout_failed" };
  }
}

/** Settle a paid/failed rebook-difference payment: apply or abandon the move. */
async function applyRebookPaymentResult(
  payment: PaymentRow,
  status: "paid" | "failed"
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const meta = JSON.parse(payment.meta || "{}") as {
    originalBookingId?: number;
    originalReference?: string;
  };

  if (status === "failed" || !meta.originalBookingId) {
    db.transaction(() => {
      db.prepare(`UPDATE payments SET status='failed', updated_at=? WHERE id=?`).run(
        now,
        payment.id
      );
      db.prepare(`UPDATE bookings SET status='expired' WHERE id=? AND status='hold'`).run(
        payment.booking_id
      );
    })();
    return;
  }

  let applied = false;
  db.transaction(() => {
    db.prepare(`UPDATE payments SET status='paid', updated_at=? WHERE id=?`).run(
      now,
      payment.id
    );
    const newRow = db
      .prepare(`SELECT * FROM bookings WHERE id=?`)
      .get(payment.booking_id) as BookingRow;
    const original = db
      .prepare(`SELECT * FROM bookings WHERE id=?`)
      .get(meta.originalBookingId) as BookingRow | undefined;
    if (!original || original.status !== "confirmed" || newRow.status !== "hold") {
      return;
    }
    // Retire the original, promote the new row under the guest's reference.
    const oldRef = `${original.group_ref}~OLD${original.id}`;
    db.prepare(
      `UPDATE bookings SET status='cancelled', cancelled_at=?, reference=?, group_ref=? WHERE id=?`
    ).run(now, oldRef, oldRef, original.id);
    db.prepare(
      `UPDATE bookings SET status='confirmed', confirmed_at=?, reference=?, group_ref=?, payment_ref=? WHERE id=?`
    ).run(now, meta.originalReference, meta.originalReference, payment.provider_ref, newRow.id);
    // Move the original captured payment onto the new row so a later
    // cancellation refunds the full amount (initial + difference).
    db.prepare(
      `UPDATE payments SET booking_id=?, updated_at=? WHERE booking_id=? AND status='paid'`
    ).run(newRow.id, now, original.id);
    applied = true;
  })();

  if (applied) {
    await sendBookingConfirmation(getBookingGroup(meta.originalReference!), {
      rebooked: true,
    });
  } else {
    await refundPayment(payment, payment.amount);
  }
}
