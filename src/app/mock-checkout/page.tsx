"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Dev-only simulated checkout page. Used whenever a payment provider has no
 * real credentials configured. Lets you complete or fail the payment; the
 * result goes through the same server-side path a real webhook would.
 */
function MockCheckoutInner() {
  const q = useSearchParams();
  const provider = q.get("provider") || "";
  const ref = q.get("ref") || "";
  const amount = q.get("amount") || "";
  const currency = q.get("currency") || "";
  const returnUrl = q.get("return") || "/";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(outcome: "paid" | "failed") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ref, outcome }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`Failed: ${data.error || res.status}`);
        setBusy(false);
        return;
      }
      window.location.href = returnUrl;
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Simulated {provider} checkout</h2>
        <p className="note">
          Development mode — no real credentials configured for provider{" "}
          <strong>{provider}</strong>. This page stands in for the provider&apos;s
          hosted checkout.
        </p>
        <div className="summary-row">
          <span>Amount</span>
          <span className="price-big">
            {amount} {currency}
          </span>
        </div>
        <div className="summary-row">
          <span>Payment reference</span>
          <span className="value" style={{ fontSize: "0.8rem" }}>
            {ref}
          </span>
        </div>
        {error && <p className="error">{error}</p>}
        <button
          className="btn"
          style={{ width: "100%", marginTop: "var(--space-3)" }}
          disabled={busy}
          onClick={() => complete("paid")}
        >
          Simulate successful payment
        </button>
        <button
          className="btn btn-danger"
          style={{ width: "100%", marginTop: "var(--space-2)" }}
          disabled={busy}
          onClick={() => complete("failed")}
        >
          Simulate failed payment
        </button>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense>
      <MockCheckoutInner />
    </Suspense>
  );
}
