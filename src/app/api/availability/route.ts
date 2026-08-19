import { NextRequest, NextResponse } from "next/server";
import { defaultCalendarMonth, monthAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

/** GET /api/availability?month=YYYY-MM → per-date state of both slots. */
export function GET(request: NextRequest) {
  const month =
    request.nextUrl.searchParams.get("month") || defaultCalendarMonth();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }
  return NextResponse.json({ month, days: monthAvailability(month) });
}
