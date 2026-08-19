import { NextRequest, NextResponse } from "next/server";
import { cancelBooking, getBookingByReference } from "@/lib/bookings";
import { isFreelyChangeable } from "@/lib/dates";
import {
  sendRebookLink,
  sendTooLateToChange,
} from "@/lib/whatsapp/messages";

export const dynamic = "force-dynamic";

/**
 * Meta Cloud API webhook.
 *
 * GET  — subscription verification handshake (hub.challenge echo).
 * POST — inbound events; we act on interactive button replies with ids
 *        "cancel|<reference>" and "rebook|<reference>" sent from our own
 *        confirmation messages. The 7-day rule is re-checked server-side:
 *        an old message's buttons cannot bypass it.
 */

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (
    q.get("hub.mode") === "subscribe" &&
    q.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    q.get("hub.challenge")
  ) {
    return new NextResponse(q.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WaMessage = {
  from?: string;
  type?: string;
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
  };
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true }); // always 200 so Meta doesn't retry storms
  }

  const messages: WaMessage[] = [];
  try {
    const entries = (body as { entry?: unknown[] }).entry ?? [];
    for (const entry of entries as Array<{ changes?: Array<{ value?: { messages?: WaMessage[] } }> }>) {
      for (const change of entry.changes ?? []) {
        for (const m of change.value?.messages ?? []) messages.push(m);
      }
    }
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const m of messages) {
    const buttonId = m.interactive?.button_reply?.id;
    if (!buttonId || !m.from) continue;
    const [action, reference] = buttonId.split("|");
    if (!reference) continue;

    const booking = getBookingByReference(reference);
    if (!booking) continue;
    // Only the guest who booked may act on it.
    if (booking.whatsapp.replace(/^\+/, "") !== m.from.replace(/^\+/, "")) continue;

    if (action === "cancel") {
      const result = await cancelBooking(reference);
      if (!result.ok && result.error === "too_late") {
        await sendTooLateToChange(booking);
      }
      // Success path: cancelBooking already sends the cancellation confirmation.
    } else if (action === "rebook") {
      if (booking.status === "confirmed" && isFreelyChangeable(booking.date, booking.slot)) {
        await sendRebookLink(booking);
      } else {
        await sendTooLateToChange(booking);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
