import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";

/**
 * Email sender (SMTP via nodemailer).
 *
 * Live mode when SMTP_HOST + SMTP_USER + SMTP_PASS are set; otherwise MOCK
 * mode: the message is logged and stored in the email_outbox table so the
 * flow can be demoed end-to-end without credentials.
 *
 * For a Gmail inbox (e.g. fayrouzy.pool@gmail.com) the owner creates an
 * App Password (Google Account → Security → 2-Step Verification → App
 * passwords) and sets:
 *   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
 *   SMTP_USER=fayrouzy.pool@gmail.com  SMTP_PASS=<app password>
 */

export function emailIsLive(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const db = getDb();

  if (!emailIsLive()) {
    console.log(`[email:mock] → ${to}\nSubject: ${subject}\n${text}`);
    db.prepare(
      `INSERT INTO email_outbox (to_address, subject, body, mode, created_at)
       VALUES (?, ?, ?, 'mock', ?)`
    ).run(to, subject, text, Date.now());
    return;
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    db.prepare(
      `INSERT INTO email_outbox (to_address, subject, body, mode, created_at)
       VALUES (?, ?, ?, 'sent', ?)`
    ).run(to, subject, text, Date.now());
  } catch (e) {
    // A failed notification must never fail the calling flow.
    console.error("[email] send failed:", e);
    db.prepare(
      `INSERT INTO email_outbox (to_address, subject, body, mode, error, created_at)
       VALUES (?, ?, ?, 'failed', ?, ?)`
    ).run(to, subject, text, String(e), Date.now());
  }
}
