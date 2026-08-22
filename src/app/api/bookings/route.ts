import { NextRequest, NextResponse } from "next/server";
import { createBookingHold } from "@/lib/bookings";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings — place a 10-minute hold and return the checkout URL.
 * { dates: string[], guestName, whatsapp, locale, provider, plan }
 * (1..14 consecutive dates). NIGHT bookings only — day slots are handled by
 * phone last-minute and are not sold on the website.
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

  if (body.slot !== "night") {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }

  const locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const result = await createBookingHold({
    dates: Array.isArray(body.dates) ? body.dates.map(String) : [],
    slot: "night",
    guestName: String(body.guestName ?? ""),
    whatsapp: String(body.whatsapp ?? ""),
    locale,
    provider: body.provider as "bank" | "whish" | "crypto",
    plan: (body.plan === "deposit" ? "deposit" : "full") as "full" | "deposit",
  });

  if (!result.ok) {
    const status = result.error === "slot_unavailable" ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
