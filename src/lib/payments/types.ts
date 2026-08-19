/**
 * Payment provider abstraction. Both current rails (bank gateway, Whish
 * wallet) implement this interface, so providers can be swapped or added
 * without touching booking logic. All credentials come from env vars.
 */

export type ProviderId = "bank" | "whish";

export interface CheckoutRequest {
  /** Our internal payment reference — the provider must echo it back in webhooks. */
  providerRef: string;
  amount: number;
  currency: string;
  description: string;
  /** Where the provider should send the guest after payment. */
  returnUrl: string;
  /** Where the provider must POST the server-to-server result. */
  webhookUrl: string;
}

export interface CheckoutSession {
  /** URL to redirect the guest to. */
  checkoutUrl: string;
}

export interface WebhookResult {
  providerRef: string;
  status: "paid" | "failed";
}

export interface RefundResult {
  ok: boolean;
  refundRef?: string;
  error?: string;
}

export interface PaymentProvider {
  id: ProviderId;
  /** True when real credentials are configured; false = local mock checkout. */
  isLive(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Parse + authenticate an incoming webhook. Returns null when the request
   * is not authentic (bad signature) — callers must then ignore it.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult | null>;
  /** Refund a previously captured payment (full or partial amount). */
  refund(providerRef: string, amount: number, currency: string): Promise<RefundResult>;
}
