import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getBookingGroup } from "@/lib/bookings";
import { releaseExpiredHolds } from "@/lib/availability";
import { getDb } from "@/lib/db";
import { ConfirmationStatus } from "@/components/ConfirmationStatus";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);

  releaseExpiredHolds();
  const rows = getBookingGroup(reference);
  if (rows.length === 0) notFound();
  const lead = rows[0];
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const payment = getDb()
    .prepare(
      `SELECT amount FROM payments WHERE booking_id=? AND purpose='booking' ORDER BY id DESC LIMIT 1`
    )
    .get(lead.id) as { amount: number } | undefined;
  const paidOnline = payment?.amount ?? total;

  return (
    <div className="container">
      <ConfirmationStatus
        locale={l}
        reference={reference}
        initial={{
          reference: lead.group_ref,
          dates: rows.map((r) => r.date),
          slot: lead.slot,
          status: lead.status,
          plan: lead.payment_plan,
          amount: total,
          paidOnline,
          balanceDue: Math.max(0, total - paidOnline),
          currency: lead.currency,
        }}
        labels={dict}
      />
    </div>
  );
}
