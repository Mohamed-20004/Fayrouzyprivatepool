import { NextRequest, NextResponse } from "next/server";
import { getBookingGroup } from "@/lib/bookings";
import { releaseExpiredHolds } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/:reference — public status of a booking group, used by
 * the confirmation page to poll while the payment webhook is pending. Only
 * non-sensitive fields are returned.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  releaseExpiredHolds();
  const rows = getBookingGroup(reference);
  if (rows.length === 0)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const lead = rows[0];
  return NextResponse.json({
    reference: lead.group_ref,
    dates: rows.map((r) => r.date),
    slot: lead.slot,
    status: lead.status,
    amount: rows.reduce((a, r) => a + r.amount, 0),
    currency: lead.currency,
  });
}
