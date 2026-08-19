import crypto from "node:crypto";
import {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  RefundResult,
  WebhookResult,
} from "@/lib/payments/types";

/**
 * Whish Money (Whish wallet) provider.
 *
 * The real merchant/checkout API endpoints and payload shapes must be filled
 * in from Whish's merchant documentation once the owner's merchant account
 * exists — the structure below (create checkout session → redirect → signed
 * webhook → refund call) matches their collect flow. Until credentials are
 * present in env, the provider runs in MOCK mode: the guest is sent to a
 * local simulated checkout page that can complete or fail the payment
 * through the same webhook path the real service would use.
 */

const API_BASE = process.env.WHISH_API_BASE || "https://whish.money/itel-service/api";

function creds() {
  return {
    merchantId: process.env.WHISH_MERCHANT_ID || "",
    apiKey: process.env.WHISH_API_KEY || "",
    webhookSecret: process.env.WHISH_WEBHOOK_SECRET || "",
  };
}

export const whishProvider: PaymentProvider = {
  id: "whish",

  isLive() {
    const c = creds();
    return !!(c.merchantId && c.apiKey && c.webhookSecret);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.isLive()) {
      // Mock mode: local simulated checkout page.
      const q = new URLSearchParams({
        provider: "whish",
        ref: req.providerRef,
        amount: String(req.amount),
        currency: req.currency,
        return: req.returnUrl,
      });
      return { checkoutUrl: `/mock-checkout?${q.toString()}` };
    }
    const c = creds();
    const res = await fetch(`${API_BASE}/payment/collect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        channel: c.merchantId,
        secret: c.apiKey,
      },
      body: JSON.stringify({
        amount: req.amount,
        currency: req.currency,
        invoice: req.description,
        externalId: req.providerRef,
        successCallbackUrl: req.webhookUrl,
        failureCallbackUrl: req.webhookUrl,
        successRedirectUrl: req.returnUrl,
        failureRedirectUrl: req.returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`Whish checkout failed: ${res.status}`);
    const data = (await res.json()) as { data?: { collectUrl?: string } };
    const url = data?.data?.collectUrl;
    if (!url) throw new Error("Whish checkout: no collectUrl in response");
    return { checkoutUrl: url };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookResult | null> {
    const c = creds();
    if (!this.isLive()) {
      // Mock mode: signed by our own mock checkout with APP_SECRET.
      return parseMockWebhook(rawBody, headers);
    }
    const signature = headers.get("x-whish-signature") || "";
    const expected = crypto
      .createHmac("sha256", c.webhookSecret)
      .update(rawBody)
      .digest("hex");
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }
    const body = JSON.parse(rawBody) as {
      externalId?: string;
      status?: string;
    };
    if (!body.externalId) return null;
    return {
      providerRef: body.externalId,
      status: body.status === "success" ? "paid" : "failed",
    };
  },

  async refund(providerRef, amount): Promise<RefundResult> {
    if (!this.isLive()) {
      return { ok: true, refundRef: `mock-refund-${providerRef}` };
    }
    const c = creds();
    const res = await fetch(`${API_BASE}/payment/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        channel: c.merchantId,
        secret: c.apiKey,
      },
      body: JSON.stringify({ externalId: providerRef, amount }),
    });
    if (!res.ok) return { ok: false, error: `Whish refund failed: ${res.status}` };
    const data = (await res.json()) as { data?: { refundId?: string } };
    return { ok: true, refundRef: data?.data?.refundId ?? providerRef };
  },
};

/** Shared by both providers' mock modes. */
export function parseMockWebhook(
  rawBody: string,
  headers: Headers
): WebhookResult | null {
  const secret = process.env.APP_SECRET || "dev-insecure-secret";
  const signature = headers.get("x-mock-signature") || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  const body = JSON.parse(rawBody) as { ref?: string; outcome?: string };
  if (!body.ref) return null;
  return { providerRef: body.ref, status: body.outcome === "paid" ? "paid" : "failed" };
}
