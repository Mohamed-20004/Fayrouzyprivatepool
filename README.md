# Chalet Booking Website

A trilingual (English / العربية / Français) booking site for a single private
chalet. Guests check a calendar, book a **day** or **night** slot, pay online
(bank card or Whish wallet), and get a WhatsApp confirmation with **Rebook**
and **Cancel** buttons. Mobile-first, full RTL for Arabic, no admin panel in
v1 — the owner edits a config file and uses a protected endpoint/script to
block dates.

**Stack:** Next.js 15 (App Router, TypeScript) · SQLite (better-sqlite3) ·
no CSS framework (design tokens in `src/styles/theme.css`).

---

## Quick start

```bash
npm install
npm run db:init     # create data/chalet.db
npm run db:seed     # realistic dummy bookings + one owner-blocked date
npm run dev         # http://localhost:3000
```

With no payment/WhatsApp credentials configured everything runs in **mock
mode**: paying opens a local simulated checkout page (choose success or
failure), and WhatsApp messages are logged to the console and stored in the
`whatsapp_outbox` table instead of being sent. The full flow — calendar →
booking → payment → confirmation → rebook/cancel — is demoable end to end.

```bash
npm run build && npm start   # production build
npm run typecheck
```

## The one file the owner edits

[`src/config/chalet.config.ts`](src/config/chalet.config.ts) holds everything
marked *placeholder* in the spec: chalet name, timezone, season, slot times,
currency, the **four base prices** (day/night × weekday/weekend), the phone
number for <7-day changes, map coordinates, and gallery images. Brand colors
live in [`src/styles/theme.css`](src/styles/theme.css); the logo in
[`src/components/Logo.tsx`](src/components/Logo.tsx). Swapping real branding
in requires no refactoring.

Two behaviour flags are **assumptions to confirm with the owner**:

| Flag | Default | Meaning |
|---|---|---|
| `priceBasis` | `"startDate"` | A slot is priced by its start date (Friday night = weekend, Sunday night = weekday). |
| `rebookPriceDifference` | `"settleDifference"` | Rebooking to a cheaper slot refunds the difference; a dearer slot requires paying it. |

## Booking model

- **Season:** May 1 – October 31 (config). All other dates are closed.
- **Two slots per date:** Day 08:00→17:00, Night 19:00→17:00 next day.
  Bookings are stored as *(calendar date + slot type)* — times are display
  values from config, all in the chalet's timezone. No timestamps stored, so
  no timezone bugs.
- **Availability rules** (all enforced server-side in
  [`src/lib/availability.ts`](src/lib/availability.ts)):
  1. Day and night slots on the same date are independent.
  2. A night booking on D blocks the **day slot on D+1**.
  3. A booked day slot on D+1 blocks the **night slot on D**.
- **Double-booking protection:** all check-then-insert logic runs inside
  synchronous SQLite transactions, and a partial unique index on
  `(date, slot)` over live bookings is the backstop. Booking creates a
  **10-minute hold** while payment is in progress; holds auto-release on
  payment failure or timeout. A booking is only *confirmed* by the payment
  provider's **server-to-server webhook** — never by the client redirect.

## Payments

Both rails implement one interface
([`src/lib/payments/types.ts`](src/lib/payments/types.ts)) so providers can
be swapped or added without touching booking logic. Credentials come from env
vars (see `.env.example`); a provider with no credentials runs in mock mode.

- **Whish wallet** ([`whish.ts`](src/lib/payments/whish.ts)) — structured
  around Whish Money's collect flow; fill in the exact endpoints/fields from
  their merchant docs once the owner's merchant account exists.
- **Bank** ([`bank.ts`](src/lib/payments/bank.ts)) — assumes a
  hosted-checkout card gateway. **Confirm with the owner:** card gateway vs
  direct bank transfer; only this adapter changes either way.

Webhooks land on `POST /api/payments/webhook/:provider`, are HMAC-verified by
the adapter, and are idempotent (replays are no-ops). If a webhook arrives
after the hold expired and the slot was taken meanwhile, the payment is
automatically refunded and the guest notified.

**Refunds:** cancelling ≥7 days before the slot start refunds every captured
payment (initial + any rebook difference) to the original method.

## WhatsApp

[`src/lib/whatsapp/`](src/lib/whatsapp) sends via the **Meta Cloud API** from
the chalet's WhatsApp Business number. The confirmation contains reference,
date, slot + times, amount paid, and the location link — in the language the
guest used on the site.

- **> 7 days before the slot:** the message carries **Rebook** / **Cancel**
  interactive buttons. Button replies arrive on
  `POST /api/whatsapp/webhook`; the 7-day rule is re-checked server-side, so
  buttons on old messages can't bypass it, and only the guest's own number
  can act on a booking.
  - **Cancel** → cancels, frees the slot, triggers the automatic refund,
    sends a cancellation confirmation.
  - **Rebook** → sends a signed, 48-hour link to `/{locale}/rebook/{token}`
    where the guest picks any available slot; the price difference is
    collected (via a normal checkout) or refunded.
- **≤ 7 days:** no buttons — the message tells the guest to call the
  chalet's phone number (config).

**Going live checklist**

1. In Meta Business: create a WhatsApp Business app, get
   `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`.
2. Point the webhook at `https://<domain>/api/whatsapp/webhook` with your
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (GET verification is implemented).
3. **Template approval:** business-initiated messages (outside the 24-hour
   service window) must use pre-approved templates — submit the
   confirmation/cancellation templates in **all three languages** (en, ar,
   fr) and swap the free-form payloads in
   [`messages.ts`](src/lib/whatsapp/messages.ts) for `type: "template"`
   payloads at go-live. Inside the 24-hour window (guests message first via
   the buttons) free-form messages work as-is.

## Blocking dates (owner)

No admin panel — two equivalent mechanisms:

**Script** (direct DB access on the server):

```bash
npm run block-dates -- block 2026-07-14 2026-07-15          # both slots
npm run block-dates -- block --slot night 2026-07-20        # night only
npm run block-dates -- unblock 2026-07-14
npm run block-dates -- list
```

**Protected endpoint** (set `ADMIN_SECRET` in env first):

```bash
curl -X POST https://<domain>/api/admin/block \
  -H "x-admin-secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"dates":["2026-07-14","2026-07-15"],"slot":"both","reason":"family visit"}'

curl -X DELETE https://<domain>/api/admin/block \
  -H "x-admin-secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"dates":["2026-07-14"],"slot":"both"}'

curl https://<domain>/api/admin/block -H "x-admin-secret: $ADMIN_SECRET"
```

## Environment variables

See [`.env.example`](.env.example). Summary: `APP_BASE_URL`, `APP_SECRET`
(signs rebook links), `ADMIN_SECRET`, optional `DATABASE_FILE`, and the
WhatsApp / Whish / bank credential sets — any credential set left empty keeps
that integration in mock mode.

## Project layout

```
src/config/chalet.config.ts   owner-editable configuration
src/lib/                      dates, pricing, availability, bookings (domain core)
src/lib/payments/             provider interface + whish/bank adapters
src/lib/whatsapp/             Cloud API client + trilingual message builders
src/i18n/                     locales + UI dictionaries (en/ar/fr)
src/app/[locale]/             pages (home/calendar, book, confirmation, rebook)
src/app/api/                  availability, bookings, webhooks, admin block
src/app/mock-checkout/        dev-only simulated payment page
scripts/                      db:init, db:seed, block-dates
data/chalet.db                SQLite database (gitignored)
```

## Deployment notes

- Needs a Node host with a **persistent disk** for `data/chalet.db` (or set
  `DATABASE_FILE` to a mounted path). Serverless platforms without persistent
  storage need the DB swapped for a hosted Postgres — the SQL is confined to
  `src/lib/db.ts` + the small queries in `availability.ts`/`bookings.ts`.
- Set `APP_BASE_URL` to the public https URL — it's used in payment
  callbacks and WhatsApp links.
- Payment provider webhooks and the WhatsApp webhook must be reachable from
  the internet.

## ⚠ Font licenses before launch

Two self-hosted brand fonts are bundled as free **personal-use versions —
commercial use is not allowed** until their licenses are purchased. Before
the site starts taking real bookings, buy both (the licensed files are
identical, so nothing needs to change in the code):

| Font | Used for | File | License |
|---|---|---|---|
| Themysion (Creatype Studio) | "Fayrouzy" script wordmark | `public/fonts/Themysion.ttf` | <https://creatypestudio.co/themysion> |
| Nourd family (Hanken Design Co.) | All site text: Light body, Semi Bold headlines, Bold buttons/nav/caps | `public/fonts/Nourd*.ttf` | <https://hanken.co/products/nourd> |

## Still needed from the owner

Chalet name/logo/colors, photos, map coordinates + address, the four prices +
currency, phone number, timezone, WhatsApp Business credentials, Whish and
bank merchant credentials, domain + hosting — plus decisions on the two
config flags above and card-gateway vs bank-transfer.
