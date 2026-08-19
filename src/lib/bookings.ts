import crypto from "node:crypto";
import { chaletConfig, SlotType } from "@/config/chalet.config";
import { getDb, BookingRow, PaymentRow } from "@/lib/db";
import {
  isSlotBookable,
  releaseExpiredHolds,
  slotState,
} from "@/lib/availability";
import {
  daysUntilSlotStart,
  isFreelyChangeable,
  isValidDateStr,
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
 * Booking lifecycle. Every state change that touches slot occupancy runs in
 * a better-sqlite3 transaction; since better-sqlite3 is synchronous and
 * SQLite serializes writers, check-then-insert cannot race. A partial unique
 * index on (date, slot) over live bookings is the last line of defence.
 */

export type CreateHoldInput = {
  date: string;
  slot: SlotType;
  guestName: string;
  whatsapp: string;
  locale: string;
  provider: ProviderId;
};

export type CreateHoldResult =
  | { ok: true; reference: string; checkoutUrl: string; amount: number }
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

/** Step 1 of the flow: place a 10-minute hold and create a checkout session. */
export async function createBookingHold(
  input: CreateHoldInput
): Promise<CreateHoldResult> {
  const db = getDb();

  if (!isValidDateStr(input.date)) return { ok: false, error: "invalid_date" };
  if (input.slot !== "day" && input.slot !== "night")
    return { ok: false, error: "invalid_slot" };
  const guestName = input.guestName.trim();
  if (guestName.length < 2 || guestName.length > 100)
    return { ok: false, error: "invalid_name" };
  const whatsapp = normalizeWhatsApp(input.whatsapp);
  if (!whatsapp) return { ok: false, error: "invalid_whatsapp" };
  const provider = getProvider(input.provider);
  if (!provider) return { ok: false, error: "invalid_provider" };

  const amount = priceFor(input.date, input.slot);
  const reference = newBookingReference();
  const providerRef = crypto.randomUUID();
  const now = Date.now();

  let bookingId: number;
  try {
    bookingId = db.transaction(() => {
      releaseExpiredHolds();
      if (!isSlotBookable(input.date, input.slot)) {
        throw new HoldError("slot_unavailable");
      }
      const res = db
        .prepare(
          `INSERT INTO bookings
             (reference, date, slot, status, guest_name, whatsapp, locale,
              amount, currency, payment_provider, hold_expires_at, created_at)
           VALUES (?, ?, ?, 'hold', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          reference,
          input.date,
          input.slot,
          guestName,
          whatsapp,
          input.locale,
          amount,
          chaletConfig.currency,
          provider.id,
          now + chaletConfig.holdMinutes * 60_000,
          now
        );
      const id = Number(res.lastInsertRowid);
      db.prepare(
        `INSERT INTO payments
           (booking_id, purpose, provider, provider_ref, amount, currency,
            status, created_at, updated_at)
         VALUES (?, 'booking', ?, ?, ?, ?, 'pending', ?, ?)`
      ).run(id, provider.id, providerRef, amount, chaletConfig.currency, now, now);
      return id;
    })();
  } catch (e) {
    if (e instanceof HoldError) return { ok: false, error: e.message };
    throw e;
  }

  try {
    const session = await provider.createCheckout({
      providerRef,
      amount,
      currency: chaletConfig.currency,
      description: `${chaletConfig.name} — ${input.date} ${input.slot} (${reference})`,
      returnUrl: `${baseUrl()}/${input.locale}/confirmation/${reference}`,
      webhookUrl: `${baseUrl()}/api/payments/webhook/${provider.id}`,
    });
    return { ok: true, reference, checkoutUrl: session.checkoutUrl, amount };
  } catch {
    // Checkout could not be created — release the hold immediately.
    db.prepare(`UPDATE bookings SET status='expired' WHERE id=? AND status='hold'`).run(
      bookingId
    );
    db.prepare(
      `UPDATE payments SET status='failed', updated_at=? WHERE provider_ref=?`
    ).run(Date.now(), providerRef);
    return { ok: false, error: "checkout_failed" };
  }
}

class HoldError extends Error {}

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

  const now = Date.now();
  type Outcome = "confirmed" | "failed" | "refund_needed";

  const outcome = db.transaction((): Outcome => {
    db.prepare(`UPDATE payments SET status=?, updated_at=? WHERE id=?`).run(
      status === "paid" ? "paid" : "failed",
      now,
      payment.id
    );
    const booking = db
      .prepare(`SELECT * FROM bookings WHERE id=?`)
      .get(payment.booking_id) as BookingRow;

    if (status === "failed") {
      if (booking.status === "hold") {
        db.prepare(`UPDATE bookings SET status='expired' WHERE id=?`).run(booking.id);
      }
      return "failed";
    }

    // Paid. Normal case: hold still active → confirm.
    if (booking.status === "hold") {
      const holdExpired =
        booking.hold_expires_at !== null && booking.hold_expires_at < now;
      if (holdExpired) {
        // Late webhook: the hold lapsed. Re-check the slot (this row is the
        // only 'hold' one for it thanks to the unique index; if it expired,
        // someone else may have booked meanwhile).
        db.prepare(`UPDATE bookings SET status='expired' WHERE id=?`).run(booking.id);
        releaseExpiredHolds();
        if (slotState(booking.date, booking.slot) === "available") {
          db.prepare(
            `UPDATE bookings SET status='confirmed', confirmed_at=?, payment_ref=? WHERE id=?`
          ).run(now, providerRef, booking.id);
          return "confirmed";
        }
        return "refund_needed";
      }
      db.prepare(
        `UPDATE bookings SET status='confirmed', confirmed_at=?, payment_ref=? WHERE id=?`
      ).run(now, providerRef, booking.id);
      return "confirmed";
    }
    if (booking.status === "confirmed") {
      return "confirmed"; // duplicate webhook
    }
    return "refund_needed"; // paid a slot that was lost
  })();

  const booking = db
    .prepare(`SELECT * FROM bookings WHERE id=?`)
    .get(payment.booking_id) as BookingRow;

  if (outcome === "confirmed") {
    await sendBookingConfirmation(booking);
  } else if (outcome === "refund_needed") {
    await refundPayment(payment, payment.amount);
    await sendPaymentFailed(booking, "slot_lost");
  } else {
    await sendPaymentFailed(booking, "payment_failed");
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
 * Cancel a confirmed booking. Only allowed while the slot start is ≥7 days
 * away (enforced here regardless of what UI/button triggered it); inside
 * that window guests must call the chalet. Frees the slot and refunds all
 * captured payments to the original method.
 */
export async function cancelBooking(reference: string): Promise<CancelResult> {
  const db = getDb();
  const booking = db
    .prepare(`SELECT * FROM bookings WHERE reference=?`)
    .get(reference) as BookingRow | undefined;
  if (!booking) return { ok: false, error: "not_found" };
  if (booking.status !== "confirmed") return { ok: false, error: "not_cancellable" };
  if (!isFreelyChangeable(booking.date, booking.slot))
    return { ok: false, error: "too_late" };

  const changed = db
    .prepare(
      `UPDATE bookings SET status='cancelled', cancelled_at=? WHERE id=? AND status='confirmed'`
    )
    .run(Date.now(), booking.id).changes;
  if (!changed) return { ok: false, error: "not_cancellable" };

  // Refund every captured payment tied to this booking (initial + any rebook difference).
  const paid = db
    .prepare(`SELECT * FROM payments WHERE booking_id=? AND status='paid'`)
    .all(booking.id) as PaymentRow[];
  let refunded = paid.length > 0;
  for (const p of paid) {
    const ok = await refundPayment(p, p.amount);
    refunded = refunded && ok;
  }

  await sendCancellationConfirmation({ ...booking, status: "cancelled" }, refunded);
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
        | "too_late"
        | "slot_unavailable"
        | "same_slot"
        | "invalid_date"
        | "checkout_failed";
    };

/**
 * Move a confirmed booking to a new available slot.
 * Cheaper/equal slot → move immediately, refund the difference (per config).
 * Dearer slot → hold the new slot and require payment of the difference;
 * the move is applied when that payment's webhook lands.
 */
export async function rebookBooking(
  reference: string,
  newDate: string,
  newSlot: SlotType
): Promise<RebookResult> {
  const db = getDb();
  if (!isValidDateStr(newDate) || (newSlot !== "day" && newSlot !== "night"))
    return { ok: false, error: "invalid_date" };

  const booking = db
    .prepare(`SELECT * FROM bookings WHERE reference=?`)
    .get(reference) as BookingRow | undefined;
  if (!booking) return { ok: false, error: "not_found" };
  if (booking.status !== "confirmed") return { ok: false, error: "not_confirmed" };
  if (!isFreelyChangeable(booking.date, booking.slot))
    return { ok: false, error: "too_late" };
  if (booking.date === newDate && booking.slot === newSlot)
    return { ok: false, error: "same_slot" };

  const newPrice = priceFor(newDate, newSlot);
  const difference = newPrice - booking.amount;

  if (difference <= 0) {
    // Move now, refund the difference if configured to.
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

    const updated = db
      .prepare(`SELECT * FROM bookings WHERE id=?`)
      .get(booking.id) as BookingRow;
    await sendBookingConfirmation(updated, { rebooked: true });
    return { ok: true, kind: "moved", reference, refundedDifference };
  }

  // Dearer slot: hold it under a temporary row and charge the difference.
  const provider = getProvider(booking.payment_provider || "whish")!;
  const providerRef = crypto.randomUUID();
  const tempReference = `${reference}~R${Date.now().toString(36).toUpperCase()}`;
  const now = Date.now();

  try {
    db.transaction(() => {
      releaseExpiredHolds();
      if (!isSlotBookable(newDate, newSlot, booking.id))
        throw new HoldError("slot_unavailable");
      const res = db
        .prepare(
          `INSERT INTO bookings
             (reference, date, slot, status, guest_name, whatsapp, locale,
              amount, currency, payment_provider, hold_expires_at, created_at)
           VALUES (?, ?, ?, 'hold', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
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
        JSON.stringify({ originalBookingId: booking.id, originalReference: reference }),
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
      description: `${chaletConfig.name} — rebook ${reference} to ${newDate} ${newSlot}`,
      returnUrl: `${baseUrl()}/${booking.locale}/confirmation/${reference}`,
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
      // Original was cancelled meanwhile, or the hold lapsed and was lost.
      return;
    }
    // Retire the original, promote the new row under the guest's reference.
    db.prepare(
      `UPDATE bookings SET status='cancelled', cancelled_at=?, reference=? WHERE id=?`
    ).run(now, `${original.reference}~OLD${original.id}`, original.id);
    db.prepare(
      `UPDATE bookings SET status='confirmed', confirmed_at=?, reference=?, payment_ref=? WHERE id=?`
    ).run(now, meta.originalReference, payment.provider_ref, newRow.id);
    // Move the original captured payment onto the new row so a later
    // cancellation refunds the full amount (initial + difference).
    db.prepare(
      `UPDATE payments SET booking_id=?, updated_at=? WHERE booking_id=? AND status='paid'`
    ).run(newRow.id, now, original.id);
    applied = true;
  })();

  if (applied) {
    const updated = db
      .prepare(`SELECT * FROM bookings WHERE id=?`)
      .get(payment.booking_id) as BookingRow;
    await sendBookingConfirmation(updated, { rebooked: true });
  } else {
    // Paid but the move could not be applied — refund the difference.
    await refundPayment(payment, payment.amount);
  }
}

export function getBookingByReference(reference: string): BookingRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM bookings WHERE reference=?`)
    .get(reference) as BookingRow | undefined;
}
