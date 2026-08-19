"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Labels = Pick<
  Dictionary,
  | "nameLabel"
  | "namePlaceholder"
  | "whatsappLabel"
  | "whatsappHint"
  | "paymentMethod"
  | "payBank"
  | "payWhish"
  | "payNow"
  | "holdNote"
  | "errRequired"
  | "errWhatsapp"
  | "errSlotTaken"
  | "errGeneric"
>;

const E164_RE = /^\+[1-9][\d\s\-()]{6,20}$/;

export function BookingForm({
  locale,
  date,
  slot,
  labels,
}: {
  locale: Locale;
  date: string;
  slot: "day" | "night";
  labels: Labels;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [provider, setProvider] = useState<"bank" | "whish">("whish");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = labels.errRequired;
    if (!E164_RE.test(whatsapp.trim())) errs.whatsapp = labels.errWhatsapp;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slot,
          guestName: name.trim(),
          whatsapp: whatsapp.trim(),
          locale,
          provider,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (res.status === 409) {
        setErrors({ form: labels.errSlotTaken });
      } else if (data.error === "invalid_whatsapp") {
        setErrors({ whatsapp: labels.errWhatsapp });
      } else {
        setErrors({ form: labels.errGeneric });
      }
    } catch {
      setErrors({ form: labels.errGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="bf-name">{labels.nameLabel}</label>
        <input
          id="bf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          autoComplete="name"
          required
        />
        {errors.name && <p className="error">{errors.name}</p>}
      </div>

      <div className="field">
        <label htmlFor="bf-wa">{labels.whatsappLabel}</label>
        <input
          id="bf-wa"
          type="tel"
          dir="ltr"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+961 70 123 456"
          autoComplete="tel"
          required
        />
        <p className="hint">{labels.whatsappHint}</p>
        {errors.whatsapp && <p className="error">{errors.whatsapp}</p>}
      </div>

      <div className="field">
        <label>{labels.paymentMethod}</label>
        <div className="radio-row" role="radiogroup" aria-label={labels.paymentMethod}>
          <label className={`radio-card ${provider === "whish" ? "selected" : ""}`}>
            <input
              type="radio"
              name="provider"
              value="whish"
              checked={provider === "whish"}
              onChange={() => setProvider("whish")}
            />
            {labels.payWhish}
          </label>
          <label className={`radio-card ${provider === "bank" ? "selected" : ""}`}>
            <input
              type="radio"
              name="provider"
              value="bank"
              checked={provider === "bank"}
              onChange={() => setProvider("bank")}
            />
            {labels.payBank}
          </label>
        </div>
      </div>

      <p className="note">{labels.holdNote}</p>
      {errors.form && <p className="error">{errors.form}</p>}

      <button className="btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
        {submitting ? <span className="spinner" /> : labels.payNow}
      </button>
    </form>
  );
}
