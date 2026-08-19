/**
 * Owner tool: block or unblock dates directly in the database (the same
 * thing the protected /api/admin/block endpoint does over HTTP).
 *
 *   npm run block-dates -- block 2026-07-14 2026-07-15        # both slots
 *   npm run block-dates -- block --slot night 2026-07-20      # one slot
 *   npm run block-dates -- unblock 2026-07-14
 *   npm run block-dates -- list
 */
import { getDb } from "../src/lib/db";
import { isValidDateStr } from "../src/lib/dates";

const db = getDb();
const args = process.argv.slice(2);
const cmd = args.shift();

let slot = "both";
const slotIdx = args.indexOf("--slot");
if (slotIdx !== -1) {
  slot = args[slotIdx + 1];
  args.splice(slotIdx, 2);
}
if (!["day", "night", "both"].includes(slot)) {
  console.error(`Invalid slot "${slot}" — use day, night or both.`);
  process.exit(1);
}

const dates = args;
if (cmd !== "list" && (dates.length === 0 || !dates.every(isValidDateStr))) {
  console.error("Provide one or more valid dates (YYYY-MM-DD).");
  process.exit(1);
}

switch (cmd) {
  case "block": {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO blocked_dates (date, slot, reason, created_at)
       VALUES (?, ?, 'Blocked by owner', ?)`
    );
    for (const d of dates) stmt.run(d, slot, Date.now());
    console.log(`Blocked ${dates.length} date(s), slot: ${slot}.`);
    break;
  }
  case "unblock": {
    const stmt =
      slot === "both"
        ? db.prepare(`DELETE FROM blocked_dates WHERE date=?`)
        : db.prepare(`DELETE FROM blocked_dates WHERE date=? AND slot=?`);
    let n = 0;
    for (const d of dates)
      n += slot === "both" ? stmt.run(d).changes : stmt.run(d, slot).changes;
    console.log(`Removed ${n} block(s).`);
    break;
  }
  case "list": {
    const rows = db
      .prepare(`SELECT date, slot, reason FROM blocked_dates ORDER BY date`)
      .all() as Array<{ date: string; slot: string; reason: string | null }>;
    if (rows.length === 0) console.log("No blocked dates.");
    for (const r of rows) console.log(`  ${r.date}  ${r.slot.padEnd(5)}  ${r.reason ?? ""}`);
    break;
  }
  default:
    console.error("Usage: npm run block-dates -- <block|unblock|list> [--slot day|night|both] [dates…]");
    process.exit(1);
}
