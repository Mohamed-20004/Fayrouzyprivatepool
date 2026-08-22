import { NextRequest, NextResponse } from "next/server";
import { chaletConfig } from "@/config/chalet.config";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Public review submission. Reviews are NOT published on the site — each one
 * is emailed to `chaletConfig.reviewsEmail`, and that is the owner's only
 * inbox for them. The `reviews` table is internal: it backs the hourly spam
 * throttle and doubles as a backup archive should an email ever go missing.
 * The owner promotes the good ones into chalet.config.ts by hand.
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

  // Email the owner. A notification failure must never fail the submission.
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const summary = `${stars} (${rating}/5) — ${name} [${locale}]\n\n${message}`;
  await sendEmail(
    chaletConfig.reviewsEmail,
    `New review: ${stars} from ${name} — ${chaletConfig.name}`,
    `New review on ${chaletConfig.name}\n\n${summary}\n\n— Sent automatically by the ${chaletConfig.name} website`
  );

  return NextResponse.json({ ok: true });
}
