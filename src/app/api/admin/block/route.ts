import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isValidDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Owner date-blocking endpoint (no admin panel in v1). Protected by the
 * ADMIN_SECRET env var, sent as the `x-admin-secret` header.
 *
 *   GET    /api/admin/block                       → list current blocks
 *   POST   /api/admin/block { dates, slot, reason } → block dates
 *   DELETE /api/admin/block { dates, slot }         → unblock dates
 *
 * `dates` is an array of "YYYY-MM-DD"; `slot` is "day" | "night" | "both"
 * (default "both"). See README → "Blocking dates" for curl examples, or use
 * `npm run block-dates` which talks to the database directly.
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  const given = request.headers.get("x-admin-secret") || "";
  if (!secret) return false; // endpoint disabled until a secret is configured
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseBody(body: unknown): { dates: string[]; slot: string; reason?: string } | null {
  const b = body as { dates?: unknown; slot?: unknown; reason?: unknown };
  const dates = Array.isArray(b.dates) ? b.dates.map(String) : [];
  if (dates.length === 0 || dates.length > 366) return null;
  if (!dates.every(isValidDateStr)) return null;
  const slot = typeof b.slot === "string" ? b.slot : "both";
  if (!["day", "night", "both"].includes(slot)) return null;
  return { dates, slot, reason: typeof b.reason === "string" ? b.reason : undefined };
}

export function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = getDb()
    .prepare(`SELECT date, slot, reason FROM blocked_dates ORDER BY date`)
    .all();
  return NextResponse.json({ blocks: rows });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO blocked_dates (date, slot, reason, created_at) VALUES (?, ?, ?, ?)`
  );
  db.transaction(() => {
    for (const date of parsed.dates) {
      stmt.run(date, parsed.slot, parsed.reason ?? null, Date.now());
    }
  })();
  return NextResponse.json({ ok: true, blocked: parsed.dates.length, slot: parsed.slot });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const db = getDb();
  const stmt =
    parsed.slot === "both"
      ? db.prepare(`DELETE FROM blocked_dates WHERE date=?`)
      : db.prepare(`DELETE FROM blocked_dates WHERE date=? AND slot=?`);
  let removed = 0;
  db.transaction(() => {
    for (const date of parsed.dates) {
      removed +=
        parsed.slot === "both"
          ? stmt.run(date).changes
          : stmt.run(date, parsed.slot).changes;
    }
  })();
  return NextResponse.json({ ok: true, removed });
}
