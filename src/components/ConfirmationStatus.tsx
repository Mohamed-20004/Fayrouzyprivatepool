"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Labels = Pick<
  Dictionary,
  | "confPendingTitle"
  | "confPendingBody"
  | "confConfirmedTitle"
  | "confConfirmedBody"
  | "confCancelledTitle"
  | "confCancelledBody"
  | "confFailedTitle"
  | "confFailedBody"
  | "confReference"
  | "bookDate"
  | "bookSlot"
  | "confAmount"
  | "daySlot"
  | "nightSlot"
  | "backToCalendar"
>;

type BookingInfo = {
  reference: string;
  date: string;
  slot: "day" | "night";
  status: "hold" | "confirmed" | "cancelled" | "expired";
  amount: number;
  currency: string;
};

/**
 * Shows the booking's live status. While the payment webhook is pending
 * (status "hold") it polls every 3 seconds.
 */
export function ConfirmationStatus({
  locale,
  reference,
  initial,
  labels,
}: {
  locale: Locale;
  reference: string;
  initial: BookingInfo;
  labels: Labels;
}) {
  const [booking, setBooking] = useState<BookingInfo>(initial);

  useEffect(() => {
    if (booking.status !== "hold") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${reference}`);
        if (res.ok) {
          const data = (await res.json()) as BookingInfo;
          setBooking(data);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [booking.status, reference]);

  const banner =
    booking.status === "confirmed"
      ? { cls: "confirmed", title: labels.confConfirmedTitle, body: labels.confConfirmedBody }
      : booking.status === "cancelled"
        ? { cls: "cancelled", title: labels.confCancelledTitle, body: labels.confCancelledBody }
        : booking.status === "expired"
          ? { cls: "failed", title: labels.confFailedTitle, body: labels.confFailedBody }
          : { cls: "pending", title: labels.confPendingTitle, body: labels.confPendingBody };

  return (
    <div className="card">
      <div className={`status-banner ${banner.cls}`}>
        {booking.status === "hold" && <span className="spinner" />}
        <h2>{banner.title}</h2>
        <p>{banner.body}</p>
      </div>

      <div className="summary-row">
        <span>{labels.confReference}</span>
        <span className="value">{booking.reference}</span>
      </div>
      <div className="summary-row">
        <span>{labels.bookDate}</span>
        <span className="value">{booking.date}</span>
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

      <p style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
        <Link href={`/${locale}`}>{labels.backToCalendar}</Link>
      </p>
    </div>
  );
}
