import { chaletConfig, SlotType } from "@/config/chalet.config";
import type { BookingRow } from "@/lib/db";
import { isFreelyChangeable } from "@/lib/dates";
import { sendWhatsAppPayload } from "@/lib/whatsapp/client";
import { signRebookToken } from "@/lib/reference";
import { baseUrl } from "@/lib/bookings";

/**
 * WhatsApp message builders, in the language the guest used on the site.
 * Templates for production must be pre-approved per language — see README.
 */

type WaLocale = "en" | "ar" | "fr";

function loc(l: string): WaLocale {
  return l === "ar" || l === "fr" ? l : "en";
}

function slotLabel(l: WaLocale, slot: SlotType): string {
  const s = chaletConfig.slots[slot];
  const names: Record<WaLocale, Record<SlotType, string>> = {
    en: { day: "Day", night: "Night" },
    ar: { day: "نهاري", night: "ليلي" },
    fr: { day: "Journée", night: "Nuitée" },
  };
  const nextDay: Record<WaLocale, string> = {
    en: "next day",
    ar: "اليوم التالي",
    fr: "lendemain",
  };
  const range = s.endsNextDay
    ? `${s.start} → ${s.end} (${nextDay[l]})`
    : `${s.start} → ${s.end}`;
  return `${names[l][slot]} ${range}`;
}

const T = {
  confirmedTitle: {
    en: "Booking confirmed ✅",
    ar: "تم تأكيد الحجز ✅",
    fr: "Réservation confirmée ✅",
  },
  rebookedTitle: {
    en: "Booking updated ✅",
    ar: "تم تعديل الحجز ✅",
    fr: "Réservation modifiée ✅",
  },
  reference: { en: "Reference", ar: "رقم الحجز", fr: "Référence" },
  date: { en: "Date", ar: "التاريخ", fr: "Date" },
  slot: { en: "Slot", ar: "الفترة", fr: "Créneau" },
  paid: { en: "Amount paid", ar: "المبلغ المدفوع", fr: "Montant payé" },
  location: { en: "Location", ar: "الموقع", fr: "Localisation" },
  changesCallUs: {
    en: `Your booking starts in less than ${chaletConfig.freeCancellationDays} days. For any changes please call us: ${chaletConfig.phone}`,
    ar: `يبدأ حجزك خلال أقل من ${chaletConfig.freeCancellationDays} أيام. لأي تعديل يرجى الاتصال بنا: ${chaletConfig.phone}`,
    fr: `Votre réservation commence dans moins de ${chaletConfig.freeCancellationDays} jours. Pour toute modification, appelez-nous : ${chaletConfig.phone}`,
  },
  rebookBtn: { en: "Rebook", ar: "تغيير الموعد", fr: "Reprogrammer" },
  cancelBtn: { en: "Cancel", ar: "إلغاء", fr: "Annuler" },
  cancelledTitle: {
    en: "Booking cancelled",
    ar: "تم إلغاء الحجز",
    fr: "Réservation annulée",
  },
  cancelledRefund: {
    en: "Your payment will be refunded in full to your original payment method.",
    ar: "سيتم رد المبلغ كاملاً إلى وسيلة الدفع الأصلية.",
    fr: "Votre paiement sera intégralement remboursé sur votre moyen de paiement d'origine.",
  },
  cancelledNoRefund: {
    en: "If a refund is due, it will be processed shortly.",
    ar: "في حال استحقاق استرداد، سيتم تنفيذه قريباً.",
    fr: "Si un remboursement est dû, il sera traité prochainement.",
  },
  rebookLinkIntro: {
    en: "Pick a new slot for your booking using this secure link (valid 48h):",
    ar: "اختر موعداً جديداً لحجزك عبر هذا الرابط الآمن (صالح لمدة 48 ساعة):",
    fr: "Choisissez un nouveau créneau via ce lien sécurisé (valable 48 h) :",
  },
  paymentFailed: {
    en: "Unfortunately your payment did not complete and no booking was made. Please try again.",
    ar: "للأسف لم تكتمل عملية الدفع ولم يتم إنشاء الحجز. يرجى المحاولة مجدداً.",
    fr: "Malheureusement votre paiement n'a pas abouti et aucune réservation n'a été créée. Veuillez réessayer.",
  },
  slotLost: {
    en: "Your payment succeeded but the slot was taken in the meantime. The full amount is being refunded to you.",
    ar: "تم الدفع بنجاح لكن الموعد لم يعد متاحاً. سيتم رد المبلغ كاملاً إليك.",
    fr: "Votre paiement a réussi mais le créneau n'était plus disponible. Le montant total vous est remboursé.",
  },
  tooLateToCancel: {
    en: `This booking starts in less than ${chaletConfig.freeCancellationDays} days and can no longer be changed here. Please call us: ${chaletConfig.phone}`,
    ar: `يبدأ هذا الحجز خلال أقل من ${chaletConfig.freeCancellationDays} أيام ولا يمكن تعديله هنا. يرجى الاتصال بنا: ${chaletConfig.phone}`,
    fr: `Cette réservation commence dans moins de ${chaletConfig.freeCancellationDays} jours et ne peut plus être modifiée ici. Appelez-nous : ${chaletConfig.phone}`,
  },
} as const;

function confirmationBody(b: BookingRow, l: WaLocale, rebooked: boolean): string {
  const lines = [
    `${rebooked ? T.rebookedTitle[l] : T.confirmedTitle[l]} — ${chaletConfig.name}`,
    ``,
    `${T.reference[l]}: ${b.reference}`,
    `${T.date[l]}: ${b.date}`,
    `${T.slot[l]}: ${slotLabel(l, b.slot)}`,
    `${T.paid[l]}: ${b.amount} ${b.currency}`,
    `${T.location[l]}: ${chaletConfig.location.mapsUrl}`,
  ];
  return lines.join("\n");
}

/**
 * Confirmation message. While the slot start is >7 days away it carries
 * interactive Rebook / Cancel buttons; inside the window it tells the guest
 * to call the chalet instead.
 */
export async function sendBookingConfirmation(
  b: BookingRow,
  opts: { rebooked?: boolean } = {}
): Promise<void> {
  const l = loc(b.locale);
  const body = confirmationBody(b, l, !!opts.rebooked);

  if (isFreelyChangeable(b.date, b.slot)) {
    await sendWhatsAppPayload(b.whatsapp, "booking_confirmation", {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: [
            {
              type: "reply",
              reply: { id: `rebook|${b.reference}`, title: T.rebookBtn[l] },
            },
            {
              type: "reply",
              reply: { id: `cancel|${b.reference}`, title: T.cancelBtn[l] },
            },
          ],
        },
      },
    });
  } else {
    await sendWhatsAppPayload(b.whatsapp, "booking_confirmation", {
      type: "text",
      text: { body: `${body}\n\n${T.changesCallUs[l]}` },
    });
  }
}

export async function sendCancellationConfirmation(
  b: BookingRow,
  refunded: boolean
): Promise<void> {
  const l = loc(b.locale);
  const body = [
    `${T.cancelledTitle[l]} — ${chaletConfig.name}`,
    ``,
    `${T.reference[l]}: ${b.reference}`,
    `${T.date[l]}: ${b.date}`,
    `${T.slot[l]}: ${slotLabel(l, b.slot)}`,
    ``,
    refunded ? T.cancelledRefund[l] : T.cancelledNoRefund[l],
  ].join("\n");
  await sendWhatsAppPayload(b.whatsapp, "cancellation_confirmation", {
    type: "text",
    text: { body },
  });
}

export async function sendRebookLink(b: BookingRow): Promise<void> {
  const l = loc(b.locale);
  const token = signRebookToken(b.reference);
  const url = `${baseUrl()}/${l}/rebook/${token}`;
  await sendWhatsAppPayload(b.whatsapp, "rebook_link", {
    type: "text",
    text: { body: `${T.rebookLinkIntro[l]}\n${url}`, preview_url: false },
  });
}

export async function sendPaymentFailed(
  b: BookingRow,
  reason: "payment_failed" | "slot_lost"
): Promise<void> {
  const l = loc(b.locale);
  const text = reason === "slot_lost" ? T.slotLost[l] : T.paymentFailed[l];
  await sendWhatsAppPayload(b.whatsapp, reason, {
    type: "text",
    text: { body: `${chaletConfig.name}\n\n${text}` },
  });
}

export async function sendTooLateToChange(b: BookingRow): Promise<void> {
  const l = loc(b.locale);
  await sendWhatsAppPayload(b.whatsapp, "too_late", {
    type: "text",
    text: { body: T.tooLateToCancel[l] },
  });
}
