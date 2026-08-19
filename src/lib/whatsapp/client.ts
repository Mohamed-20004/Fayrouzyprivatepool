import { getDb } from "@/lib/db";

/**
 * WhatsApp Business sender (Meta Cloud API).
 *
 * Live mode when WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set;
 * otherwise MOCK mode: the exact payload is logged and stored in the
 * whatsapp_outbox table so the flow can be demoed end-to-end.
 *
 * NOTE for production: business-initiated messages (and any message outside
 * the 24-hour customer service window) must use pre-approved template
 * messages — one template per language (en / ar / fr). The payload builders
 * in messages.ts produce free-form interactive messages, which work inside
 * the service window and in the sandbox; swap `type: "interactive"` for the
 * approved `template` payloads at go-live. See README → WhatsApp.
 */

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export function whatsappIsLive(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export async function sendWhatsAppPayload(
  toNumber: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNumber.replace(/^\+/, ""),
    ...payload,
  };

  if (!whatsappIsLive()) {
    console.log(`[whatsapp:mock] → ${toNumber} (${kind})`, JSON.stringify(body, null, 2));
    db.prepare(
      `INSERT INTO whatsapp_outbox (to_number, kind, body, mode, created_at)
       VALUES (?, ?, ?, 'mock', ?)`
    ).run(toNumber, kind, JSON.stringify(body), Date.now());
    return;
  }

  try {
    const res = await fetch(
      `${GRAPH_BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp send failed ${res.status}: ${err}`);
    }
    db.prepare(
      `INSERT INTO whatsapp_outbox (to_number, kind, body, mode, created_at)
       VALUES (?, ?, ?, 'sent', ?)`
    ).run(toNumber, kind, JSON.stringify(body), Date.now());
  } catch (e) {
    // A failed notification must never fail the booking flow.
    console.error("[whatsapp] send failed:", e);
    db.prepare(
      `INSERT INTO whatsapp_outbox (to_number, kind, body, mode, error, created_at)
       VALUES (?, ?, ?, 'failed', ?, ?)`
    ).run(toNumber, kind, JSON.stringify(body), String(e), Date.now());
  }
}
