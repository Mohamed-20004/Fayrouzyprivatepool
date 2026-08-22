import { NextRequest, NextResponse } from "next/server";
import { chaletConfig } from "@/config/chalet.config";
import { getDb } from "@/lib/db";
import { sendWhatsAppPayload } from "@/lib/whatsapp/client";

export const dynamic = "force-dynamic";

/**
 * Public review submission. Reviews are NOT published on the site — they go
 * to the owner: stored in the `reviews` table (readable via
 * GET /api/admin/reviews with the admin secret) and forwarded as a WhatsApp
 * message to the chalet's own number. The owner promotes the good ones into
 * chalet.config.ts by hand.
 */

const MAX_PER_HOUR = 10; // site-wide cap; a private chalet gets a handful of real ones

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    rating?: unknown;
    message?: unknown;
    locale?: unknown;
    website?: unknown; // honeypot — humans never see or fill this field
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  // Honeypot hit: claim success, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const rating = Number(body.rating);
  const locale =
    typeof body.locale === "string" && ["en", "ar", "fr"].includes(body.locale)
      ? body.locale
      : "en";

  if (
    name.length < 1 ||
    name.length > 80 ||
    message.length < 1 ||
    message.length > 1500 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = getDb();
  const recent = db
    .prepare(`SELECT COUNT(*) AS n FROM reviews WHERE created_at > ?`)
    .get(Date.now() - 60 * 60 * 1000) as { n: number };
  if (recent.n >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "too_many_reviews" }, { status: 429 });
  }

  db.prepare(
    `INSERT INTO reviews (name, rating, message, locale, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(name, rating, message, locale, Date.now());

  // Forward to the owner's WhatsApp. Never fail the submission over it.
  const owner = chaletConfig.phone.replace(/\s/g, "");
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  await sendWhatsAppPayload(owner, "review_notification", {
    type: "text",
    text: {
      body: `New review on ${chaletConfig.name}\n${stars} (${rating}/5) — ${name} [${locale}]\n\n${message}`,
    },
  });

  return NextResponse.json({ ok: true });
}
