import { NextRequest, NextResponse } from "next/server";
import { createBookingHold, createFlexibleHold } from "@/lib/bookings";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings — place a 10-minute hold and return the checkout URL.
 *
 * Two shapes:
 *  - Specific dates: { dates: string[], slot, guestName, whatsapp, locale, provider }
 *    (1..14 consecutive dates, all booked as the same slot type)
 *  - Flexible:       { flexible: { month: "YYYY-MM", count }, slot, ... }
 *    — the server assigns a random available run in that month.
 *
 * A booking is only confirmed once the payment provider's webhook reports
 * success.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const common = {
    slot: body.slot as "day" | "night",
    guestName: String(body.guestName ?? ""),
    whatsapp: String(body.whatsapp ?? ""),
    locale,
    provider: body.provider as "bank" | "whish",
  };

  const flexible = body.flexible as { month?: unknown; count?: unknown } | undefined;
  const result = flexible
    ? await createFlexibleHold({
        ...common,
        month: String(flexible.month ?? ""),
        count: Number(flexible.count ?? 1),
      })
    : await createBookingHold({
        ...common,
        dates: Array.isArray(body.dates) ? body.dates.map(String) : [],
      });

  if (!result.ok) {
    const status =
      result.error === "slot_unavailable" || result.error === "no_availability"
        ? 409
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
