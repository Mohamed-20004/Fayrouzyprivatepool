import crypto from "node:crypto";

/** Guest-facing booking reference, e.g. "CH-7K2M9Q". Unambiguous alphabet. */
export function newBookingReference(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % alphabet.length];
  return `CH-${s}`;
}

function secret(): string {
  return process.env.APP_SECRET || "dev-insecure-secret";
}

/**
 * Signed, expiring token for rebook links sent over WhatsApp.
 * Format: base64url(reference|expiresMs|hmac).
 */
export function signRebookToken(reference: string, ttlMs = 48 * 3600_000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${reference}|${exp}`;
  const mac = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}|${mac}`).toString("base64url");
}

export function verifyRebookToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [reference, expStr, mac] = raw.split("|");
    if (!reference || !expStr || !mac) return null;
    const expected = crypto
      .createHmac("sha256", secret())
      .update(`${reference}|${expStr}`)
      .digest("base64url");
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() > Number(expStr)) return null;
    return reference;
  } catch {
    return null;
  }
}
