import type { Locale } from "@/i18n/config";

/** All UI strings. WhatsApp message strings live in src/lib/whatsapp/messages.ts. */

const en = {
  // Hero
  heroEyebrow: "The Bekaa Highlands · Lebanon",
  tagline:
    "A private mountain retreat above the treeline. Four bedrooms, an infinity pool, and views that redefine what silence sounds like.",
  ctaReserve: "Reserve your stay",
  ctaExplore: "Explore the chalet",
  scrollHint: "Scroll",

  // Nav
  navGallery: "Gallery",
  navBook: "Book",
  navLocation: "Location",
  navReviews: "Reviews",
  navContact: "Contact",
  reserve: "Reserve",
  bookNow: "Book now",

  // Amenities strip
  amenPool: "Infinity pool",
  amenViews: "Mountain views",
  amenKitchen: "Gourmet kitchen",
  amenSuites: "4 en-suites",
  amenLiving: "Grand living room",
  amenWifi: "Fibre internet",

  // Gallery
  gallery: "Gallery",
  galleryTitle1: "Every Hour,",
  galleryTitle2: "a Different Light",
  tabPool: "Pool",
  tabInteriors: "Interiors",
  tabViews: "Views",

  // Booking section
  bookEyebrow: "Reservations",
  bookTitle1: "Book Your",
  bookTitle2: "Stay",
  fromWord: "From",
  instantConfirmation: "Instant confirmation",
  calendarHint: "Pick a date, then choose a day or night slot.",
  daySlot: "Day",
  nightSlot: "Night",
  nextDayShort: "next day",
  legendAvailable: "Available",
  legendBooked: "Booked",
  legendBlocked: "Unavailable",
  legendClosed: "Closed",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  seasonNote: "The chalet is bookable from May 1 to October 31.",
  loading: "Loading…",
  summaryTitle: "Booking Summary",
  selectSlotHint: "→ Select a date and slot on the calendar",
  proceedPayment: "Proceed to payment",
  includedTitle: "What's included",
  inc1: "Exclusive use of the entire chalet",
  inc2: "Heated infinity pool",
  inc3: "Fully equipped gourmet kitchen",
  inc4: "High-speed fibre internet",
  inc5: "Outdoor barbecue & panoramic terrace",
  inc6: "Housekeeping before every stay",
  inc7: "WhatsApp confirmation & support",

  // Booking form page
  bookTitle: "Complete your booking",
  bookDate: "Date",
  bookSlot: "Slot",
  bookPrice: "Price",
  nameLabel: "Full name",
  namePlaceholder: "Your name",
  whatsappLabel: "WhatsApp number",
  whatsappHint: "With country code, e.g. +961 70 123 456",
  paymentMethod: "Payment method",
  payBank: "Bank card",
  payWhish: "Whish wallet",
  payNow: "Pay now",
  holdNote: "The slot is held for 10 minutes while you pay.",
  errRequired: "This field is required.",
  errWhatsapp: "Enter a valid number with country code, e.g. +961 70 123 456.",
  errSlotTaken: "Sorry, this slot was just taken. Please pick another one.",
  errGeneric: "Something went wrong. Please try again.",

  // Confirmation page
  confTitle: "Your booking",
  confPendingTitle: "Payment in progress…",
  confPendingBody:
    "We're waiting for your payment confirmation. This page refreshes automatically.",
  confConfirmedTitle: "Booking confirmed",
  confConfirmedBody:
    "A confirmation was sent to your WhatsApp with all the details.",
  confCancelledTitle: "Booking cancelled",
  confCancelledBody:
    "This booking has been cancelled. Any refund goes back to your original payment method.",
  confFailedTitle: "Payment not completed",
  confFailedBody:
    "The payment didn't complete and no booking was made. You can try again.",
  confReference: "Reference",
  confAmount: "Amount",
  backToCalendar: "Back to the calendar",

  // Rebook page
  rebookTitle: "Reschedule your booking",
  rebookCurrent: "Current booking",
  rebookPickNew: "Pick a new slot",
  rebookInvalid: "This link is invalid or has expired.",
  rebookTooLate:
    "This booking starts in less than 7 days and can no longer be changed online. Please call us:",
  rebookSame: "That's your current slot — pick a different one.",
  rebookConfirm: "Confirm new slot",
  rebookDiffPay: "Price difference to pay:",
  rebookDiffRefund: "You'll be refunded the difference:",
  rebookDiffNone: "Same price — no extra payment.",
  rebookMoved: "Your booking was moved! A new confirmation was sent on WhatsApp.",
  cancelBooking: "Cancel booking",
  cancelAsk: "Cancel this booking? You'll get a full refund.",
  cancelDone: "Your booking was cancelled and the refund initiated.",

  // Location
  locationEyebrow: "Location",
  location: "Location",
  locationTitle1: "Bekaa Highlands,",
  locationTitle2: "Lebanon",
  locationLead:
    "Perched at 1,800 metres above sea level, the chalet sits at the convergence of ancient cedar forests, alpine meadows, and uninterrupted valley views stretching across the Bekaa.",
  specAddress: "Address",
  specCoordinates: "Coordinates",
  specAltitude: "Altitude",
  specDistances: "Distances",
  openInMaps: "Open in Google Maps",

  // Reviews
  reviewsEyebrow: "Guest Reviews",
  reviewsTitle1: "What Our",
  reviewsTitle2: "Guests Say",
  staysSuffix: "stays",

  // Footer
  getInTouch: "Get in touch",
  followAlong: "Follow along",
  footerBlurb:
    "A private mountain retreat in the highlands of Lebanon. Available for day and night stays throughout the season.",
  rightsReserved: "All rights reserved.",

  langSwitch: "Language",
} as const;

export type Dictionary = { [K in keyof typeof en]: string };

const ar: Dictionary = {
  heroEyebrow: "مرتفعات البقاع · لبنان",
  tagline:
    "ملاذ جبلي خاص فوق خط الأشجار. أربع غرف نوم، مسبح لامتناهٍ، وإطلالات تعيد تعريف صوت السكينة.",
  ctaReserve: "احجز إقامتك",
  ctaExplore: "اكتشف الشاليه",
  scrollHint: "مرّر",

  navGallery: "المعرض",
  navBook: "الحجز",
  navLocation: "الموقع",
  navReviews: "التقييمات",
  navContact: "اتصل بنا",
  reserve: "احجز",
  bookNow: "احجز الآن",

  amenPool: "مسبح لامتناهٍ",
  amenViews: "إطلالات جبلية",
  amenKitchen: "مطبخ فاخر",
  amenSuites: "4 أجنحة",
  amenLiving: "صالة رحبة",
  amenWifi: "إنترنت فايبر",

  gallery: "معرض الصور",
  galleryTitle1: "كل ساعة،",
  galleryTitle2: "ضوء مختلف",
  tabPool: "المسبح",
  tabInteriors: "الداخل",
  tabViews: "الإطلالات",

  bookEyebrow: "الحجوزات",
  bookTitle1: "احجز",
  bookTitle2: "إقامتك",
  fromWord: "ابتداءً من",
  instantConfirmation: "تأكيد فوري",
  calendarHint: "اختر التاريخ ثم اختر الفترة النهارية أو الليلية.",
  daySlot: "نهاري",
  nightSlot: "ليلي",
  nextDayShort: "اليوم التالي",
  legendAvailable: "متاح",
  legendBooked: "محجوز",
  legendBlocked: "غير متاح",
  legendClosed: "مغلق",
  prevMonth: "الشهر السابق",
  nextMonth: "الشهر التالي",
  seasonNote: "الشاليه متاح للحجز من 1 أيار (مايو) حتى 31 تشرين الأول (أكتوبر).",
  loading: "جارٍ التحميل…",
  summaryTitle: "ملخص الحجز",
  selectSlotHint: "← اختر التاريخ والفترة من التقويم",
  proceedPayment: "المتابعة إلى الدفع",
  includedTitle: "ماذا يشمل الحجز",
  inc1: "الشاليه بكامله حصرياً لك",
  inc2: "مسبح لامتناهٍ مدفّأ",
  inc3: "مطبخ فاخر مجهز بالكامل",
  inc4: "إنترنت فايبر فائق السرعة",
  inc5: "شواء خارجي وتراس بانورامي",
  inc6: "تنظيف كامل قبل كل إقامة",
  inc7: "تأكيد ودعم عبر واتساب",

  bookTitle: "أكمل حجزك",
  bookDate: "التاريخ",
  bookSlot: "الفترة",
  bookPrice: "السعر",
  nameLabel: "الاسم الكامل",
  namePlaceholder: "اسمك",
  whatsappLabel: "رقم واتساب",
  whatsappHint: "مع رمز الدولة، مثال: 456 123 70 961+",
  paymentMethod: "طريقة الدفع",
  payBank: "بطاقة مصرفية",
  payWhish: "محفظة Whish",
  payNow: "ادفع الآن",
  holdNote: "يتم حجز الفترة لمدة 10 دقائق أثناء إتمام الدفع.",
  errRequired: "هذا الحقل مطلوب.",
  errWhatsapp: "أدخل رقماً صحيحاً مع رمز الدولة، مثال: 456 123 70 961+.",
  errSlotTaken: "عذراً، تم حجز هذه الفترة للتو. يرجى اختيار فترة أخرى.",
  errGeneric: "حدث خطأ ما. يرجى المحاولة مجدداً.",

  confTitle: "حجزك",
  confPendingTitle: "الدفع قيد المعالجة…",
  confPendingBody: "بانتظار تأكيد الدفع. تتحدث هذه الصفحة تلقائياً.",
  confConfirmedTitle: "تم تأكيد الحجز",
  confConfirmedBody: "أُرسل تأكيد إلى واتساب الخاص بك مع كل التفاصيل.",
  confCancelledTitle: "تم إلغاء الحجز",
  confCancelledBody:
    "تم إلغاء هذا الحجز. أي استرداد سيعود إلى وسيلة الدفع الأصلية.",
  confFailedTitle: "لم يكتمل الدفع",
  confFailedBody: "لم تكتمل عملية الدفع ولم يتم إنشاء أي حجز. يمكنك المحاولة مجدداً.",
  confReference: "رقم الحجز",
  confAmount: "المبلغ",
  backToCalendar: "العودة إلى التقويم",

  rebookTitle: "إعادة جدولة حجزك",
  rebookCurrent: "الحجز الحالي",
  rebookPickNew: "اختر موعداً جديداً",
  rebookInvalid: "هذا الرابط غير صالح أو انتهت صلاحيته.",
  rebookTooLate:
    "يبدأ هذا الحجز خلال أقل من 7 أيام ولا يمكن تعديله عبر الإنترنت. يرجى الاتصال بنا:",
  rebookSame: "هذا هو موعدك الحالي — اختر موعداً مختلفاً.",
  rebookConfirm: "تأكيد الموعد الجديد",
  rebookDiffPay: "فرق السعر المطلوب دفعه:",
  rebookDiffRefund: "سيتم رد فرق السعر إليك:",
  rebookDiffNone: "نفس السعر — لا دفعات إضافية.",
  rebookMoved: "تم نقل حجزك! أُرسل تأكيد جديد عبر واتساب.",
  cancelBooking: "إلغاء الحجز",
  cancelAsk: "إلغاء هذا الحجز؟ ستستعيد المبلغ كاملاً.",
  cancelDone: "تم إلغاء حجزك وبدأت عملية الاسترداد.",

  locationEyebrow: "الموقع",
  location: "الموقع",
  locationTitle1: "مرتفعات البقاع،",
  locationTitle2: "لبنان",
  locationLead:
    "على ارتفاع 1,800 متر فوق سطح البحر، يقع الشاليه عند ملتقى غابات الأرز العريقة والمروج الجبلية وإطلالات ممتدة بلا انقطاع على سهل البقاع.",
  specAddress: "العنوان",
  specCoordinates: "الإحداثيات",
  specAltitude: "الارتفاع",
  specDistances: "المسافات",
  openInMaps: "افتح في خرائط غوغل",

  reviewsEyebrow: "تقييمات الضيوف",
  reviewsTitle1: "ماذا يقول",
  reviewsTitle2: "ضيوفنا",
  staysSuffix: "إقامة",

  getInTouch: "تواصل معنا",
  followAlong: "تابعنا",
  footerBlurb:
    "ملاذ جبلي خاص في مرتفعات لبنان. متاح للإقامات النهارية والليلية طوال الموسم.",
  rightsReserved: "جميع الحقوق محفوظة.",

  langSwitch: "اللغة",
};

const fr: Dictionary = {
  heroEyebrow: "Les hauteurs de la Bekaa · Liban",
  tagline:
    "Un refuge de montagne privé au-dessus des arbres. Quatre chambres, une piscine à débordement et des vues qui redéfinissent le son du silence.",
  ctaReserve: "Réservez votre séjour",
  ctaExplore: "Découvrir le chalet",
  scrollHint: "Défiler",

  navGallery: "Galerie",
  navBook: "Réserver",
  navLocation: "Localisation",
  navReviews: "Avis",
  navContact: "Contact",
  reserve: "Réserver",
  bookNow: "Réserver",

  amenPool: "Piscine à débordement",
  amenViews: "Vues montagne",
  amenKitchen: "Cuisine gastronomique",
  amenSuites: "4 suites",
  amenLiving: "Grand salon",
  amenWifi: "Internet fibre",

  gallery: "Galerie",
  galleryTitle1: "Chaque heure,",
  galleryTitle2: "une autre lumière",
  tabPool: "Piscine",
  tabInteriors: "Intérieurs",
  tabViews: "Vues",

  bookEyebrow: "Réservations",
  bookTitle1: "Réservez",
  bookTitle2: "votre séjour",
  fromWord: "À partir de",
  instantConfirmation: "Confirmation instantanée",
  calendarHint: "Choisissez une date, puis un créneau journée ou nuitée.",
  daySlot: "Journée",
  nightSlot: "Nuitée",
  nextDayShort: "lendemain",
  legendAvailable: "Disponible",
  legendBooked: "Réservé",
  legendBlocked: "Indisponible",
  legendClosed: "Fermé",
  prevMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  seasonNote: "Le chalet est réservable du 1er mai au 31 octobre.",
  loading: "Chargement…",
  summaryTitle: "Récapitulatif",
  selectSlotHint: "→ Sélectionnez une date et un créneau sur le calendrier",
  proceedPayment: "Procéder au paiement",
  includedTitle: "Ce qui est inclus",
  inc1: "Le chalet entier, en exclusivité",
  inc2: "Piscine à débordement chauffée",
  inc3: "Cuisine gastronomique tout équipée",
  inc4: "Internet fibre très haut débit",
  inc5: "Barbecue extérieur & terrasse panoramique",
  inc6: "Ménage complet avant chaque séjour",
  inc7: "Confirmation & assistance WhatsApp",

  bookTitle: "Finalisez votre réservation",
  bookDate: "Date",
  bookSlot: "Créneau",
  bookPrice: "Prix",
  nameLabel: "Nom complet",
  namePlaceholder: "Votre nom",
  whatsappLabel: "Numéro WhatsApp",
  whatsappHint: "Avec l'indicatif pays, ex. +961 70 123 456",
  paymentMethod: "Moyen de paiement",
  payBank: "Carte bancaire",
  payWhish: "Portefeuille Whish",
  payNow: "Payer",
  holdNote: "Le créneau est bloqué 10 minutes pendant le paiement.",
  errRequired: "Ce champ est obligatoire.",
  errWhatsapp: "Entrez un numéro valide avec l'indicatif pays, ex. +961 70 123 456.",
  errSlotTaken: "Désolé, ce créneau vient d'être pris. Choisissez-en un autre.",
  errGeneric: "Une erreur est survenue. Veuillez réessayer.",

  confTitle: "Votre réservation",
  confPendingTitle: "Paiement en cours…",
  confPendingBody:
    "Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.",
  confConfirmedTitle: "Réservation confirmée",
  confConfirmedBody:
    "Une confirmation a été envoyée sur votre WhatsApp avec tous les détails.",
  confCancelledTitle: "Réservation annulée",
  confCancelledBody:
    "Cette réservation a été annulée. Tout remboursement revient sur votre moyen de paiement d'origine.",
  confFailedTitle: "Paiement non abouti",
  confFailedBody:
    "Le paiement n'a pas abouti et aucune réservation n'a été créée. Vous pouvez réessayer.",
  confReference: "Référence",
  confAmount: "Montant",
  backToCalendar: "Retour au calendrier",

  rebookTitle: "Reprogrammer votre réservation",
  rebookCurrent: "Réservation actuelle",
  rebookPickNew: "Choisissez un nouveau créneau",
  rebookInvalid: "Ce lien est invalide ou a expiré.",
  rebookTooLate:
    "Cette réservation commence dans moins de 7 jours et ne peut plus être modifiée en ligne. Appelez-nous :",
  rebookSame: "C'est votre créneau actuel — choisissez-en un autre.",
  rebookConfirm: "Confirmer le nouveau créneau",
  rebookDiffPay: "Différence de prix à payer :",
  rebookDiffRefund: "La différence vous sera remboursée :",
  rebookDiffNone: "Même prix — aucun paiement supplémentaire.",
  rebookMoved:
    "Votre réservation a été déplacée ! Une nouvelle confirmation a été envoyée sur WhatsApp.",
  cancelBooking: "Annuler la réservation",
  cancelAsk: "Annuler cette réservation ? Vous serez intégralement remboursé.",
  cancelDone: "Votre réservation a été annulée et le remboursement lancé.",

  locationEyebrow: "Localisation",
  location: "Localisation",
  locationTitle1: "Hauteurs de la Bekaa,",
  locationTitle2: "Liban",
  locationLead:
    "Perché à 1 800 mètres d'altitude, le chalet se trouve à la rencontre des forêts de cèdres millénaires, des prairies alpines et de vues ininterrompues sur la vallée de la Bekaa.",
  specAddress: "Adresse",
  specCoordinates: "Coordonnées",
  specAltitude: "Altitude",
  specDistances: "Distances",
  openInMaps: "Ouvrir dans Google Maps",

  reviewsEyebrow: "Avis des hôtes",
  reviewsTitle1: "Ce que disent",
  reviewsTitle2: "nos hôtes",
  staysSuffix: "séjours",

  getInTouch: "Nous contacter",
  followAlong: "Suivez-nous",
  footerBlurb:
    "Un refuge de montagne privé dans les hauteurs du Liban. Disponible en journée et en nuitée pendant toute la saison.",
  rightsReserved: "Tous droits réservés.",

  langSwitch: "Langue",
};

const dictionaries: Record<Locale, Dictionary> = { en, ar, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
