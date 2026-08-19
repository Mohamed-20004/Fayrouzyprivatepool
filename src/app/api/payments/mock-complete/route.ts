import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/payments";
import { applyPaymentResult } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/mock-complete — dev-only endpoint driven by the local
 * simulated checkout page. Refuses to run for a provider that has real
 * credentials configured, so it is inert in production.
 */
export async function POST(request: NextRequest) {
  let body: { provider?: string; ref?: string; outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const provider = getProvider(body.provider ?? "");
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  if (provider.isLive()) {
    return NextResponse.json({ error: "provider_is_live" }, { status: 403 });
  }
  if (!body.ref || (body.outcome !== "paid" && body.outcome !== "failed")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await applyPaymentResult(body.ref, body.outcome);
  return NextResponse.json({ ok: true });
}
