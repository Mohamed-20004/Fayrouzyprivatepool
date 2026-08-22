/**
 * Seed realistic dummy bookings across the current season so the calendar,
 * cross-blocking rules, and WhatsApp flows can be demoed end to end.
 *
 *   npm run db:seed
 *
 * Safe to re-run: it wipes previous seeded rows (references starting "CH-")
 * before inserting. Do NOT run against a production database.
 */
import { chaletConfig } from "../src/config/chalet.config";
import { getDb } from "../src/lib/db";
import { addDays, todayInChaletTz } from "../src/lib/dates";
import { priceFor } from "../src/lib/pricing";
import { newBookingReference } from "../src/lib/reference";

const db = getDb();

const GUESTS = [
  { name: "Rami Haddad", whatsapp: "+96170111222", locale: "en" },
  { name: "Layla Khoury", whatsapp: "+96171333444", locale: "ar" },
  { name: "Marie Dubois", whatsapp: "+33612345678", locale: "fr" },
  { name: "Omar Nassar", whatsapp: "+96176555666", locale: "ar" },
  { name: "John Smith", whatsapp: "+447700900123", locale: "en" },
  { name: "Nour Saab", whatsapp: "+96103777888", locale: "en" },
];

function seed() {
  const wiped = db
    .prepare(`DELETE FROM bookings WHERE reference LIKE 'CH-%'`)
    .run().changes;
  db.prepare(`DELETE FROM whatsapp_outbox`).run();
  db.prepare(
    `DELETE FROM payments WHERE booking_id NOT IN (SELECT id FROM bookings)`
  ).run();
  if (wiped) console.log(`Removed ${wiped} previous seeded bookings.`);

  const today = todayInChaletTz();
  const insertBooking = db.prepare(
    `INSERT INTO bookings
       (reference, group_ref, date, slot, status, guest_name, whatsapp, locale,
        amount, currency, payment_provider, payment_ref, created_at, confirmed_at)
     VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertPayment = db.prepare(
    `INSERT INTO payments
       (booking_id, purpose, provider, provider_ref, amount, currency, status,
        created_at, updated_at)
     VALUES (?, 'booking', ?, ?, ?, ?, 'paid', ?, ?)`
  );

  // A booking every ~4 days for the next ~10 weeks, alternating slots, plus
  // deliberate pairs that exercise the cross-blocking rules.
  const plan: Array<{ offset: number; slot: "day" | "night" }> = [];
  for (let i = 3; i <= 70; i += 4) {
    plan.push({ offset: i, slot: i % 8 === 3 ? "night" : "day" });
  }
  // Explicit rule demos: night on D (blocks day D+1), and day on D+1 next to
  // a free night D (blocks night D).
  plan.push({ offset: 10, slot: "night" });
  plan.push({ offset: 15, slot: "day" });

  const inserted = new Set<string>();
  let count = 0;
  for (const p of plan) {
    const date = addDays(today, p.offset);
    const key = `${date}|${p.slot}`;
    if (inserted.has(key)) continue;

    // Respect the availability rules while seeding.
    const clash = db
      .prepare(
        `SELECT 1 FROM bookings
         WHERE status IN ('hold','confirmed') AND (
           (date=? AND slot=?) OR
           (?='day'   AND date=? AND slot='night') OR
           (?='night' AND date=? AND slot='day')
         ) LIMIT 1`
      )
      .get(
        date,
        p.slot,
        p.slot,
        addDays(date, -1),
        p.slot,
        addDays(date, 1)
      );
    if (clash) continue;

    const [y, m, d] = date.split("-").map(Number);
    if (!isInSeasonYmd(m, d)) continue;

    const guest = GUESTS[count % GUESTS.length];
    const amount = priceFor(date, p.slot);
    const reference = newBookingReference();
    const providerRef = `seed-${reference}`;
    const provider = count % 2 === 0 ? "whish" : "bank";
    const now = Date.now();

    const res = insertBooking.run(
      reference,
      reference,
      date,
      p.slot,
      guest.name,
      guest.whatsapp,
      guest.locale,
      amount,
      chaletConfig.currency,
      provider,
      providerRef,
      now,
      now
    );
    insertPayment.run(
      Number(res.lastInsertRowid),
      provider,
      providerRef,
      amount,
      chaletConfig.currency,
      now,
      now
    );
    inserted.add(key);
    count++;
    console.log(`  ${reference}  ${date}  ${p.slot.padEnd(5)}  ${amount} ${chaletConfig.currency}  ${guest.name}`);
    void y;
  }

  // One owner-blocked date for the demo.
  const blockedDate = addDays(today, 21);
  db.prepare(
    `INSERT OR REPLACE INTO blocked_dates (date, slot, reason, created_at)
     VALUES (?, 'both', 'Owner maintenance (seeded demo)', ?)`
  ).run(blockedDate, Date.now());

  console.log(`\nSeeded ${count} confirmed bookings.`);
  console.log(`Blocked ${blockedDate} (both slots) as an owner-block demo.`);
}

function isInSeasonYmd(m: number, d: number): boolean {
  const { startMonth, startDay, endMonth, endDay } = chaletConfig.season;
  const v = m * 100 + d;
  return v >= startMonth * 100 + startDay && v <= endMonth * 100 + endDay;
}

seed();
