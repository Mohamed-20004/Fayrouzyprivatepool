import crypto from "node:crypto";
import {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  RefundResult,
  WebhookResult,
} from "@/lib/payments/types";
import { parseMockWebhook } from "@/lib/payments/whish";

/**
 * Crypto payments provider.
 *
 * Structured around a hosted-invoice crypto processor (NOWPayments-style:
 * create invoice → redirect to hosted payment page → signed IPN callback).
 * The exact endpoints and field names must be confirmed against the chosen
 * processor's docs once the owner's merchant account exists — nothing else
 * in the codebase changes, per the PaymentProvider interface.
 *
 * NOTE: crypto payments are generally NOT automatically refundable. refund()
 * reports failure in live mode so cancellations fall back to the "refund
 * will be processed shortly" path, and the owner settles it manually.
 *
 * Without credentials in env it runs in MOCK mode via the local simulated
 * checkout page.
 */

const API_BASE = process.env.CRYPTO_API_BASE || "https://api.nowpayments.io/v1";

function creds() {
  return {
    apiKey: process.env.CRYPTO_API_KEY || "",
    webhookSecret: process.env.CRYPTO_WEBHOOK_SECRET || "",
  };
}

export const cryptoProvider: PaymentProvider = {
  id: "crypto",

  isLive() {
    const c = creds();
    return !!(c.apiKey && c.webhookSecret);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.isLive()) {
      const q = new URLSearchParams({
        provider: "crypto",
        ref: req.providerRef,
        amount: String(req.amount),
        currency: req.currency,
        return: req.returnUrl,
      });
      return { checkoutUrl: `/mock-checkout?${q.toString()}` };
    }
    const c = creds();
    const res = await fetch(`${API_BASE}/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": c.apiKey,
      },
      body: JSON.stringify({
        price_amount: req.amount,
        price_currency: req.currency.toLowerCase(),
        order_id: req.providerRef,
        order_description: req.description,
        ipn_callback_url: req.webhookUrl,
        success_url: req.returnUrl,
        cancel_url: req.returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`Crypto checkout failed: ${res.status}`);
    const data = (await res.json()) as { invoice_url?: string };
    if (!data.invoice_url) throw new Error("Crypto checkout: no invoice_url");
    return { checkoutUrl: data.invoice_url };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookResult | null> {
    if (!this.isLive()) return parseMockWebhook(rawBody, headers);
    const c = creds();
    // NOWPayments signs the JSON body (keys sorted) with HMAC-SHA512.
    const signature = headers.get("x-nowpayments-sig") || "";
    let body: { order_id?: string; payment_status?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const sorted = JSON.stringify(
      Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b)))
    );
    const expected = crypto
      .createHmac("sha512", c.webhookSecret)
      .update(sorted)
      .digest("hex");
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }
    if (!body.order_id) return null;
    const s = body.payment_status;
    if (s === "finished" || s === "confirmed") {
      return { providerRef: body.order_id, status: "paid" };
    }
    if (s === "failed" || s === "expired" || s === "refunded") {
      return { providerRef: body.order_id, status: "failed" };
    }
    // Intermediate statuses (waiting, confirming, partially_paid): ignore.
    return null;
  },

  async refund(providerRef): Promise<RefundResult> {
    if (!this.isLive()) {
      return { ok: true, refundRef: `mock-refund-${providerRef}` };
    }
    // Crypto payments are not automatically refundable — the owner settles
    // refunds manually (the cancellation message tells the guest a refund
    // will be processed shortly).
    return { ok: false, error: "crypto refunds are manual" };
  },
};
