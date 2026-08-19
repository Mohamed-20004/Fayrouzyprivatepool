import { NextRequest, NextResponse } from "next/server";
import { verifyRebookToken } from "@/lib/reference";
import {
  cancelBooking,
  getBookingByReference,
  rebookBooking,
} from "@/lib/bookings";
import { isFreelyChangeable } from "@/lib/dates";
import { chaletConfig } from "@/config/chalet.config";

export const dynamic = "force-dynamic";

/**
 * The rebook page's API. The token is the signed link sent over WhatsApp —
 * possession of a valid token is the guest's authentication.
 *
 * GET  — current booking details for the reschedule page.
 * POST — { action: "move", date, slot } or { action: "cancel" }.
 */

function authenticate(token: string) {
  const reference = verifyRebookToken(token);
  if (!reference) return null;
  const booking = getBookingByReference(reference);
  if (!booking) return null;
  return booking;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = authenticate(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  return NextResponse.json({
    reference: booking.reference,
    date: booking.date,
    slot: booking.slot,
    status: booking.status,
    amount: booking.amount,
    currency: booking.currency,
    changeable:
      booking.status === "confirmed" && isFreelyChangeable(booking.date, booking.slot),
    phone: chaletConfig.phone,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = authenticate(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  let body: { action?: string; date?: string; slot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "cancel") {
    const result = await cancelBooking(booking.reference);
    if (!result.ok) {
      const status = result.error === "too_late" ? 403 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (body.action === "move") {
    const result = await rebookBooking(
      booking.reference,
      String(body.date ?? ""),
      body.slot as "day" | "night"
    );
    if (!result.ok) {
      const status =
        result.error === "too_late"
          ? 403
          : result.error === "slot_unavailable"
            ? 409
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
