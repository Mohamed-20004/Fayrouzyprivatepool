import { NextRequest, NextResponse } from "next/server";
import { verifyRebookToken } from "@/lib/reference";
import {
  cancelBooking,
  getBookingGroup,
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
 * POST — { action: "move", date, slot } (single-day bookings only)
 *        or { action: "cancel" } (whole group).
 */

function authenticate(token: string) {
  const groupRef = verifyRebookToken(token);
  if (!groupRef) return null;
  const rows = getBookingGroup(groupRef);
  if (rows.length === 0) return null;
  return rows;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = authenticate(token);
  if (!rows) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  const lead = rows[0];
  return NextResponse.json({
    reference: lead.group_ref,
    dates: rows.map((r) => r.date),
    slot: lead.slot,
    status: lead.status,
    amount: rows.reduce((a, r) => a + r.amount, 0),
    currency: lead.currency,
    changeable:
      rows.every((r) => r.status === "confirmed") &&
      isFreelyChangeable(lead.date, lead.slot),
    /** Online reschedule: single-day, fully-paid bookings only. */
    rebookable: rows.length === 1 && lead.payment_plan === "full",
    phone: chaletConfig.phone,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = authenticate(token);
  if (!rows) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  const groupRef = rows[0].group_ref;

  let body: { action?: string; date?: string; slot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "cancel") {
    const result = await cancelBooking(groupRef);
    if (!result.ok) {
      const status = result.error === "too_late" ? 403 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (body.action === "move") {
    const result = await rebookBooking(
      groupRef,
      String(body.date ?? ""),
      body.slot as "day" | "night"
    );
    if (!result.ok) {
      const status =
        result.error === "too_late" || result.error === "not_rebookable"
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
