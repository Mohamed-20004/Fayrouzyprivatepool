/**
 * ─── Chalet configuration ───────────────────────────────────────────────────
 *
 * This is the single file the owner edits. No admin panel in v1: prices,
 * season, contact details, branding and map coordinates all live here.
 * Everything marked PLACEHOLDER is expected to be replaced before launch.
 */

export const chaletConfig = {
  /** PLACEHOLDER — chalet display name (header wordmark, titles, WhatsApp messages). */
  name: "Cedar Ridge",

  /** IANA timezone of the chalet. All slot times are local to this zone. */
  timezone: "Asia/Beirut",

  /** Bookable season (inclusive, month/day, every year). */
  season: {
    startMonth: 5, // May 1
    startDay: 1,
    endMonth: 10, // October 31
    endDay: 31,
  },

  /**
   * The two bookable slots per date. Times are DISPLAY values in the chalet's
   * local timezone; bookings are stored as (date + slot type), never as
   * timestamps, to avoid timezone bugs.
   */
  slots: {
    day: { start: "08:00", end: "17:00", endsNextDay: false },
    night: { start: "19:00", end: "17:00", endsNextDay: true },
  },

  /** Currency code used for all prices. PLACEHOLDER — confirm with owner. */
  currency: "USD",

  /**
   * The four base prices. PLACEHOLDER values — owner supplies real prices.
   * Weekend = Friday and Saturday.
   */
  prices: {
    dayWeekday: 150,
    dayWeekend: 200,
    nightWeekday: 250,
    nightWeekend: 320,
  },

  /** Days counted as weekend (0=Sun … 5=Fri, 6=Sat). Friday + Saturday. */
  weekendDays: [5, 6],

  /**
   * How a slot's weekday/weekend price is determined.
   * "startDate": priced by the date the slot starts (Friday night = weekend,
   *              Sunday night = weekday). ASSUMPTION — confirm with owner;
   * "endDate":   priced by the date the slot ends.
   */
  priceBasis: "startDate" as "startDate" | "endDate",

  /**
   * Rebooking: when the newly chosen slot is cheaper, refund the difference;
   * when it is more expensive, collect the difference before confirming.
   * ASSUMPTION — confirm with owner. Set to "noRefundOnCheaper" to keep the
   * difference instead of refunding it.
   */
  rebookPriceDifference: "settleDifference" as
    | "settleDifference"
    | "noRefundOnCheaper",

  /** Minutes a slot is held while payment is in progress. */
  holdMinutes: 10,

  /** Free cancellation / rebooking window: full refund when the slot starts in ≥ this many days. */
  freeCancellationDays: 7,

  /** PLACEHOLDER — phone number guests must call for changes within 7 days of the slot. */
  phone: "+961 3 456 789",

  /** PLACEHOLDER — contact + social details shown in the footer. */
  contact: {
    email: "stay@cedarridgechalet.com",
    instagram: { handle: "@cedarridgechalet", url: "https://instagram.com/cedarridgechalet" },
    facebook: { handle: "Cedar Ridge Chalet", url: "https://facebook.com/cedarridgechalet" },
    youtube: { handle: "Cedar Ridge", url: "https://youtube.com/@cedarridgechalet" },
  },

  /** PLACEHOLDER — chalet coordinates for the map pin, and location facts. */
  location: {
    lat: 34.1234,
    lng: 36.0123,
    address: "Tannourine el-Fawqa, Bekaa Valley, Lebanon",
    /** Short caps line used in the footer. */
    shortAddress: "Tannourine · Bekaa Valley · Lebanon",
    coordinatesLabel: "34.1234° N, 36.0123° E",
    altitude: "1,800 m",
    distances: "Baalbek 45 min · Byblos 70 min · Beirut 90 min",
    /** Link sent in WhatsApp confirmations and used by "Open in Google Maps". */
    mapsUrl: "https://maps.google.com/?q=34.1234,36.0123",
    /** Set false to hide the embedded map and show only the facts table. */
    showEmbeddedMap: true,
  },

  /** Full-bleed hero image (owner-supplied photo in /public/gallery). */
  heroImage: "/gallery/hero.jpg",

  /**
   * PLACEHOLDER — gallery images (replace files in /public/gallery).
   * `category` drives the gallery tabs; `time` drives the Day/Night filter.
   */
  gallery: [
    { src: "/gallery/pool-day.svg", alt: "Infinity pool at golden hour", category: "pool", time: "day" },
    { src: "/gallery/pool-night.svg", alt: "The pool lit at night", category: "pool", time: "night" },
    { src: "/gallery/interior-day.svg", alt: "Grand living room in daylight", category: "interiors", time: "day" },
    { src: "/gallery/interior-night.svg", alt: "Living room by lamplight", category: "interiors", time: "night" },
    { src: "/gallery/view-day.svg", alt: "Valley views above the treeline", category: "views", time: "day" },
    { src: "/gallery/view-night.svg", alt: "Stars over the ridge", category: "views", time: "night" },
  ] as ReadonlyArray<{
    src: string;
    alt: string;
    category: "pool" | "interiors" | "views";
    time: "day" | "night";
  }>,

  /**
   * PLACEHOLDER — guest reviews shown on the site (v1 has no review system;
   * the owner curates these here). `quote` is per-locale.
   */
  reviews: {
    average: "5.0",
    count: 47,
    items: [
      {
        initials: "SM",
        name: "Sarah & Marco",
        meta: { en: "Italy · August 2025", ar: "إيطاليا · آب 2025", fr: "Italie · Août 2025" },
        quote: {
          en: "Absolutely breathtaking. The pool at night is something else entirely — we stayed up far too late watching the stars. The kitchen has everything you could possibly need, and the views from the master bedroom made every morning feel like a gift.",
          ar: "مذهل بكل معنى الكلمة. المسبح ليلاً شيء آخر تماماً — سهرنا حتى وقت متأخر نراقب النجوم. المطبخ مجهز بكل ما يمكن أن تحتاجه، والإطلالة من غرفة النوم الرئيسية جعلت كل صباح يبدو كهدية.",
          fr: "Absolument époustouflant. La piscine de nuit est une expérience à part — nous avons veillé bien trop tard à regarder les étoiles. La cuisine a tout ce qu'il faut, et la vue depuis la chambre principale faisait de chaque matin un cadeau.",
        },
      },
      {
        initials: "LK",
        name: "Layla Khoury",
        meta: { en: "Lebanon · July 2025", ar: "لبنان · تموز 2025", fr: "Liban · Juillet 2025" },
        quote: {
          en: "We've rented chalets across the country and nothing compares. The Whish payment was instant and smooth. The place is pristine, the pool temperature was perfect, and the host responded within minutes to every question. We're already planning to return.",
          ar: "استأجرنا شاليهات في كل أنحاء البلد ولا شيء يقارن بهذا المكان. الدفع عبر Whish كان فورياً وسلساً. المكان نظيف تماماً، وحرارة المسبح مثالية، والمضيف يرد خلال دقائق على كل سؤال. نخطط للعودة بالفعل.",
          fr: "Nous avons loué des chalets dans tout le pays et rien n'est comparable. Le paiement Whish a été instantané et fluide. L'endroit est impeccable, la température de la piscine parfaite, et l'hôte répondait en quelques minutes à chaque question. Nous prévoyons déjà de revenir.",
        },
      },
      {
        initials: "JH",
        name: "James & Helen",
        meta: { en: "United Kingdom · June 2025", ar: "المملكة المتحدة · حزيران 2025", fr: "Royaume-Uni · Juin 2025" },
        quote: {
          en: "This is the definition of a hidden gem. The day-to-night transformation of this place has to be seen to be believed. Booking and card payment were seamless, with the WhatsApp confirmation arriving instantly. Will definitely be back for a winter stay.",
          ar: "هذا هو تعريف الجوهرة المخفية. تحوّل المكان من النهار إلى الليل يجب أن يُرى ليُصدَّق. الحجز والدفع بالبطاقة كانا سلسين تماماً، ووصل تأكيد واتساب فوراً. سنعود حتماً لإقامة شتوية.",
          fr: "C'est la définition même d'un joyau caché. La transformation du lieu entre jour et nuit doit être vue pour être crue. La réservation et le paiement par carte ont été d'une fluidité totale, avec la confirmation WhatsApp reçue instantanément. Nous reviendrons pour un séjour d'hiver.",
        },
      },
      {
        initials: "NR",
        name: "Nour El Rashid",
        meta: { en: "UAE · May 2025", ar: "الإمارات · أيار 2025", fr: "EAU · Mai 2025" },
        quote: {
          en: "Magnificent views, impeccable cleanliness, and a level of privacy that's rare to find. The bathroom is a work of art — the stone finishes feel truly bespoke. A stunning retreat from the city.",
          ar: "إطلالات رائعة، ونظافة لا تشوبها شائبة، ومستوى من الخصوصية نادراً ما تجده. الحمّام تحفة فنية — التشطيبات الحجرية تبدو مصممة خصيصاً. ملاذ مذهل بعيداً عن المدينة.",
          fr: "Des vues magnifiques, une propreté impeccable et un niveau d'intimité rare. La salle de bain est une œuvre d'art — les finitions en pierre semblent réellement sur mesure. Une retraite superbe loin de la ville.",
        },
      },
    ],
  },
} as const;

export type SlotType = "day" | "night";
export type ChaletConfig = typeof chaletConfig;
