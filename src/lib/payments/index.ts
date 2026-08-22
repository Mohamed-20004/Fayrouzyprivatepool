import { PaymentProvider, ProviderId } from "@/lib/payments/types";
import { bankProvider } from "@/lib/payments/bank";
import { whishProvider } from "@/lib/payments/whish";
import { cryptoProvider } from "@/lib/payments/crypto";

const providers: Record<ProviderId, PaymentProvider> = {
  bank: bankProvider,
  whish: whishProvider,
  crypto: cryptoProvider,
};

export function getProvider(id: string): PaymentProvider | null {
  if (id === "bank" || id === "whish" || id === "crypto") return providers[id];
  return null;
}

export function providerIds(): ProviderId[] {
  return Object.keys(providers) as ProviderId[];
}
