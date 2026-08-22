import { NextRequest, NextResponse } from "next/server";
import { pickFlexibleDates } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * GET /api/flexible?month=YYYY-MM&count=N — suggest a random available run
 * of N consecutive NIGHTS in the month, without holding it. The guest sees
 * exactly which dates they'd book (and can re-roll) before committing; the
 * transactional hold at booking time remains the authority.
 */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const result = pickFlexibleDates(
    q.get("month") ?? "",
    Number(q.get("count") ?? 1),
    "night"
  );
  if (!result.ok) {
    const status = result.error === "no_availability" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
