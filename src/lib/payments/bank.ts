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
 * Bank payment provider.
 *
 * OPEN QUESTION for the owner: card gateway (hosted checkout) vs direct bank
 * transfer. This implementation assumes a hosted-checkout card gateway (the
 * common case for Lebanese banks — e.g. Audi e-payment / areeba). The exact
 * endpoints and field names must be filled in from the chosen gateway's docs;
 * the interface guarantees nothing else in the codebase changes.
 *
 * Without credentials in env it runs in MOCK mode via the local simulated
 * checkout page.
 */

const API_BASE = process.env.BANK_API_BASE || "https://gateway.example-bank.com/api";

function creds() {
  return {
    merchantId: process.env.BANK_MERCHANT_ID || "",
    apiKey: process.env.BANK_API_KEY || "",
    webhookSecret: process.env.BANK_WEBHOOK_SECRET || "",
  };
}

export const bankProvider: PaymentProvider = {
  id: "bank",

  isLive() {
    const c = creds();
    return !!(c.merchantId && c.apiKey && c.webhookSecret);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.isLive()) {
      const q = new URLSearchParams({
        provider: "bank",
        ref: req.providerRef,
        amount: String(req.amount),
        currency: req.currency,
        return: req.returnUrl,
      });
      return { checkoutUrl: `/mock-checkout?${q.toString()}` };
    }
    const c = creds();
    const res = await fetch(`${API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.apiKey}`,
      },
      body: JSON.stringify({
        merchant_id: c.merchantId,
        amount: req.amount,
        currency: req.currency,
        description: req.description,
        merchant_reference: req.providerRef,
        return_url: req.returnUrl,
        webhook_url: req.webhookUrl,
      }),
    });
    if (!res.ok) throw new Error(`Bank checkout failed: ${res.status}`);
    const data = (await res.json()) as { checkout_url?: string };
    if (!data.checkout_url) throw new Error("Bank checkout: no checkout_url");
    return { checkoutUrl: data.checkout_url };
  },

  async parseWebhook(rawBody, headers): Promise<WebhookResult | null> {
    if (!this.isLive()) return parseMockWebhook(rawBody, headers);
    const c = creds();
    const signature = headers.get("x-signature") || "";
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
      merchant_reference?: string;
      status?: string;
    };
    if (!body.merchant_reference) return null;
    return {
      providerRef: body.merchant_reference,
      status: body.status === "captured" || body.status === "paid" ? "paid" : "failed",
    };
  },

  async refund(providerRef, amount, currency): Promise<RefundResult> {
    if (!this.isLive()) {
      return { ok: true, refundRef: `mock-refund-${providerRef}` };
    }
    const c = creds();
    const res = await fetch(`${API_BASE}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.apiKey}`,
      },
      body: JSON.stringify({
        merchant_reference: providerRef,
        amount,
        currency,
      }),
    });
    if (!res.ok) return { ok: false, error: `Bank refund failed: ${res.status}` };
    const data = (await res.json()) as { refund_id?: string };
    return { ok: true, refundRef: data.refund_id ?? providerRef };
  },
};
