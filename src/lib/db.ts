import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite database. better-sqlite3 is synchronous, so a db.transaction()
 * callback runs as a single serialized unit — this is what makes the
 * availability-check-then-insert booking flow race-free without row locks.
 */

const DB_FILE =
  process.env.DATABASE_FILE || path.join(process.cwd(), "data", "chalet.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  _db = new Database(DB_FILE);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      reference     TEXT NOT NULL UNIQUE,          -- guest-facing booking reference
      date          TEXT NOT NULL,                 -- YYYY-MM-DD, chalet-local calendar date
      slot          TEXT NOT NULL CHECK (slot IN ('day','night')),
      status        TEXT NOT NULL CHECK (status IN ('hold','confirmed','cancelled','expired')),
      guest_name    TEXT NOT NULL,
      whatsapp      TEXT NOT NULL,                 -- E.164, e.g. +9617xxxxxxx
      locale        TEXT NOT NULL DEFAULT 'en',
      amount        INTEGER NOT NULL,              -- total paid/payable, in config currency
      currency      TEXT NOT NULL,
      payment_provider TEXT,                       -- 'bank' | 'whish'
      payment_ref   TEXT,                          -- provider-side reference
      refund_ref    TEXT,
      hold_expires_at INTEGER,                     -- unix ms; only meaningful while status='hold'
      created_at    INTEGER NOT NULL,
      confirmed_at  INTEGER,
      cancelled_at  INTEGER
    );

    -- At most one live booking (hold or confirmed) per (date, slot).
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_live_slot
      ON bookings(date, slot) WHERE status IN ('hold','confirmed');

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

    CREATE TABLE IF NOT EXISTS blocked_dates (
      date       TEXT NOT NULL,                    -- YYYY-MM-DD
      slot       TEXT NOT NULL CHECK (slot IN ('day','night','both')),
      reason     TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (date, slot)
    );

    -- Payment attempts (one booking can have several: initial + rebook difference).
    CREATE TABLE IF NOT EXISTS payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id   INTEGER NOT NULL REFERENCES bookings(id),
      purpose      TEXT NOT NULL CHECK (purpose IN ('booking','rebook_difference')),
      provider     TEXT NOT NULL,
      provider_ref TEXT NOT NULL UNIQUE,
      amount       INTEGER NOT NULL,
      currency     TEXT NOT NULL,
      status       TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded','partially_refunded')),
      -- for rebook payments: the slot to move to once paid
      meta         TEXT,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    -- WhatsApp messages sent (or, in mock mode, that would have been sent).
    CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      to_number  TEXT NOT NULL,
      kind       TEXT NOT NULL,
      body       TEXT NOT NULL,                    -- JSON payload of the message
      mode       TEXT NOT NULL CHECK (mode IN ('sent','mock','failed')),
      error      TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

export type BookingRow = {
  id: number;
  reference: string;
  date: string;
  slot: "day" | "night";
  status: "hold" | "confirmed" | "cancelled" | "expired";
  guest_name: string;
  whatsapp: string;
  locale: string;
  amount: number;
  currency: string;
  payment_provider: string | null;
  payment_ref: string | null;
  refund_ref: string | null;
  hold_expires_at: number | null;
  created_at: number;
  confirmed_at: number | null;
  cancelled_at: number | null;
};

export type PaymentRow = {
  id: number;
  booking_id: number;
  purpose: "booking" | "rebook_difference";
  provider: string;
  provider_ref: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  meta: string | null;
  created_at: number;
  updated_at: number;
};
