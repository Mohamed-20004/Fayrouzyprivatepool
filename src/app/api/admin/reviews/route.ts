import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, type ReviewRow } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Owner review inbox (no admin panel in v1). Protected by ADMIN_SECRET,
 * sent as the `x-admin-secret` header — same scheme as /api/admin/block.
 *
 *   GET    /api/admin/reviews        → list all reviews, newest first
 *   DELETE /api/admin/reviews {id}   → remove one (spam / handled)
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  const given = request.headers.get("x-admin-secret") || "";
  if (!secret) return false; // endpoint disabled until a secret is configured
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = getDb()
    .prepare(`SELECT * FROM reviews ORDER BY created_at DESC`)
    .all() as ReviewRow[];
  return NextResponse.json({
    reviews: rows.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      message: r.message,
      locale: r.locale,
      submittedAt: new Date(r.created_at).toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const removed = getDb().prepare(`DELETE FROM reviews WHERE id = ?`).run(id).changes;
  return NextResponse.json({ ok: true, removed });
}
