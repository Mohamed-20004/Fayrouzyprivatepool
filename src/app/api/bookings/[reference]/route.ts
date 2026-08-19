import { NextRequest, NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/bookings";
import { releaseExpiredHolds } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/:reference — public status of a booking, used by the
 * confirmation page to poll while the payment webhook is pending. Only
 * non-sensitive fields are returned.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  releaseExpiredHolds();
  const b = getBookingByReference(reference);
  if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    reference: b.reference,
    date: b.date,
    slot: b.slot,
    status: b.status,
    amount: b.amount,
    currency: b.currency,
  });
}
