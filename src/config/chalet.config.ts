/**
 * ─── Chalet configuration ───────────────────────────────────────────────────
 *
 * This is the single file the owner edits. No admin panel in v1: prices,
 * season, contact details, branding and map coordinates all live here.
 * Everything marked PLACEHOLDER is expected to be replaced before launch.
 */

export const chaletConfig = {
  /** PLACEHOLDER — chalet display name (shown in the header, titles, WhatsApp messages). */
  name: "Cedar View Chalet",

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
  phone: "+961 70 000 000",

  /** PLACEHOLDER — chalet coordinates for the map pin, and address line. */
  location: {
    lat: 34.0058,
    lng: 35.6839,
    address: "Mount Lebanon, Lebanon",
    /** Link sent in WhatsApp confirmations. */
    mapsUrl: "https://maps.google.com/?q=34.0058,35.6839",
  },

  /** PLACEHOLDER — gallery images (replace files in /public/gallery). */
  gallery: [
    { src: "/gallery/pool.svg", alt: "Private pool" },
    { src: "/gallery/terrace.svg", alt: "Terrace with mountain view" },
    { src: "/gallery/living.svg", alt: "Living room" },
    { src: "/gallery/bedroom.svg", alt: "Master bedroom" },
    { src: "/gallery/bbq.svg", alt: "BBQ area" },
    { src: "/gallery/night.svg", alt: "The chalet at night" },
  ],
} as const;

export type SlotType = "day" | "night";
export type ChaletConfig = typeof chaletConfig;
