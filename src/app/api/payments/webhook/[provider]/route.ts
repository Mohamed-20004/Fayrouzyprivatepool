import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/payments";
import { applyPaymentResult } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook/:provider — server-to-server payment result.
 * The provider adapter authenticates the request (HMAC signature); anything
 * unauthenticated is dropped. Bookings are only ever confirmed here, never
 * from client redirects.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const provider = getProvider(providerId);
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });

  const rawBody = await request.text();
  const result = await provider.parseWebhook(rawBody, request.headers);
  if (!result) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  await applyPaymentResult(result.providerRef, result.status);
  return NextResponse.json({ ok: true });
}
