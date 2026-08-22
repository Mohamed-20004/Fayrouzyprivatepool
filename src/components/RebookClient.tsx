"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Calendar, type CalendarLabels } from "@/components/Calendar";

type Labels = CalendarLabels &
  Pick<
    Dictionary,
    | "rebookTitle"
    | "rebookCurrent"
    | "rebookPickNew"
    | "rebookInvalid"
    | "rebookTooLate"
    | "rebookSame"
    | "rebookConfirm"
    | "rebookDiffPay"
    | "rebookDiffRefund"
    | "rebookDiffNone"
    | "rebookMoved"
    | "rebookMultiNote"
    | "cancelBooking"
    | "cancelAsk"
    | "cancelDone"
    | "bookDate"
    | "bookSlot"
    | "confAmount"
    | "errSlotTaken"
    | "errGeneric"
  >;

type BookingInfo = {
  reference: string;
  dates: string[];
  slot: "day" | "night";
  status: string;
  amount: number;
  currency: string;
  changeable: boolean;
  rebookable: boolean;
  phone: string;
};

export function RebookClient({
  locale,
  token,
  labels,
  currency,
  initialMonth,
  minMonth,
  maxMonth,
}: {
  locale: Locale;
  token: string;
  labels: Labels;
  currency: string;
  initialMonth: string;
  minMonth: string;
  maxMonth: string;
}) {
  const [booking, setBooking] = useState<BookingInfo | null | "loading">("loading");
  const [selection, setSelection] = useState<{
    dates: string[];
    slot: "day" | "night";
    total: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<"moved" | "cancelled" | null>(null);

  useEffect(() => {
    fetch(`/api/rebook/${token}`)
      .then(async (r) => (r.ok ? ((await r.json()) as BookingInfo) : null))
      .then(setBooking)
      .catch(() => setBooking(null));
  }, [token]);

  if (booking === "loading") {
    return (
      <p style={{ textAlign: "center" }}>
        <span className="spinner" /> {labels.loading}
      </p>
    );
  }
  if (!booking) {
    return (
      <div className="card">
        <p className="error">{labels.rebookInvalid}</p>
      </div>
    );
  }
  if (!booking.changeable && !done) {
    return (
      <div className="card">
        <p>
          {labels.rebookTooLate} <strong dir="ltr">{booking.phone}</strong>
        </p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="card">
        <div className={`status-banner ${done === "moved" ? "confirmed" : "cancelled"}`}>
          <p>{done === "moved" ? labels.rebookMoved : labels.cancelDone}</p>
        </div>
      </div>
    );
  }

  const diff = selection ? selection.total - booking.amount : 0;

  async function confirmMove() {
    if (!selection || booking === "loading" || !booking) return;
    if (
      selection.dates[0] === booking.dates[0] &&
      selection.slot === booking.slot
    ) {
      setMessage(labels.rebookSame);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/rebook/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          date: selection.dates[0],
          slot: selection.slot,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.kind === "payment_required") {
          window.location.href = data.checkoutUrl;
          return;
        }
        setDone("moved");
      } else if (data.error === "slot_unavailable") {
        setMessage(labels.errSlotTaken);
      } else if (data.error === "same_slot") {
        setMessage(labels.rebookSame);
      } else {
        setMessage(labels.errGeneric);
      }
    } catch {
      setMessage(labels.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!window.confirm(labels.cancelAsk)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/rebook/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setDone("cancelled");
      else setMessage(labels.errGeneric);
    } catch {
      setMessage(labels.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <h3>{labels.rebookCurrent}</h3>
        <div className="summary-row">
          <span>{labels.bookDate}</span>
          <span className="value" dir="ltr">
            {booking.dates.length === 1
              ? booking.dates[0]
              : `${booking.dates[0]} → ${booking.dates[booking.dates.length - 1]} (×${booking.dates.length})`}
          </span>
        </div>
        <div className="summary-row">
          <span>{labels.bookSlot}</span>
          <span className="value">
            {booking.slot === "day" ? labels.daySlot : labels.nightSlot}
          </span>
        </div>
        <div className="summary-row">
          <span>{labels.confAmount}</span>
          <span className="value">
            {booking.amount} {booking.currency}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-danger"
          style={{ width: "100%", marginTop: "var(--space-3)" }}
          onClick={doCancel}
          disabled={busy}
        >
          {labels.cancelBooking}
        </button>
      </div>

      {!booking.rebookable ? (
        <div className="card">
          <p>
            {labels.rebookMultiNote} <strong dir="ltr">{booking.phone}</strong>
          </p>
        </div>
      ) : (
        <h3 style={{ textAlign: "center" }}>{labels.rebookPickNew}</h3>
      )}
      {booking.rebookable && (
      <Calendar
        locale={locale}
        labels={labels}
        currency={currency}
        initialMonth={initialMonth}
        minMonth={minMonth}
        maxMonth={maxMonth}
        onSelect={(dates, slot, total) => {
          setSelection({ dates: [dates[0]], slot, total });
          setMessage(null);
        }}
        selected={selection}
      />
      )}

      {booking.rebookable && selection && (
        <div className="card">
          <div className="summary-row">
            <span>{labels.bookDate}</span>
            <span className="value">{selection.dates[0]}</span>
          </div>
          <div className="summary-row">
            <span>{labels.bookSlot}</span>
            <span className="value">
              {selection.slot === "day" ? labels.daySlot : labels.nightSlot}
            </span>
          </div>
          <div className="summary-row">
            <span>
              {diff > 0
                ? labels.rebookDiffPay
                : diff < 0
                  ? labels.rebookDiffRefund
                  : labels.rebookDiffNone}
            </span>
            {diff !== 0 && (
              <span className="value">
                {Math.abs(diff)} {booking.currency}
              </span>
            )}
          </div>
          {message && <p className="error">{message}</p>}
          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: "var(--space-3)" }}
            onClick={confirmMove}
            disabled={busy}
          >
            {busy ? <span className="spinner" /> : labels.rebookConfirm}
          </button>
        </div>
      )}
      {!selection && message && <p className="error">{message}</p>}
    </>
  );
}
