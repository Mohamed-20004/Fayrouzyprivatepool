import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getBookingByReference } from "@/lib/bookings";
import { releaseExpiredHolds } from "@/lib/availability";
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
  const booking = getBookingByReference(reference);
  if (!booking) notFound();

  return (
    <div className="container">
      <ConfirmationStatus
        locale={l}
        reference={reference}
        initial={{
          reference: booking.reference,
          date: booking.date,
          slot: booking.slot,
          status: booking.status,
          amount: booking.amount,
          currency: booking.currency,
        }}
        labels={dict}
      />
    </div>
  );
}
