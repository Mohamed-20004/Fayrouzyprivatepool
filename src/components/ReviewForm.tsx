"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Labels = Pick<
  Dictionary,
  | "leaveReviewTitle"
  | "leaveReviewLead"
  | "nameLabel"
  | "namePlaceholder"
  | "reviewRatingLabel"
  | "reviewMessageLabel"
  | "reviewMessagePlaceholder"
  | "reviewSubmit"
  | "reviewThanks"
  | "reviewSendError"
  | "errRequired"
>;

/**
 * Guest review form. Submissions are private — stored server-side and
 * forwarded to the owner's WhatsApp, never auto-published on the site.
 */
export function ReviewForm({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [showRequired, setShowRequired] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim() || rating < 1) {
      setShowRequired(true);
      return;
    }
    setShowRequired(false);
    setState("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, message, locale, website }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="panel review-form">
        <h3>{labels.leaveReviewTitle}</h3>
        <p className="review-thanks">✓ {labels.reviewThanks}</p>
      </div>
    );
  }

  const shown = hoverRating || rating;

  return (
    <form className="panel review-form" onSubmit={submit}>
      <h3>{labels.leaveReviewTitle}</h3>
      <p className="review-lead">{labels.leaveReviewLead}</p>

      <div className="field">
        <label htmlFor="rev-name">{labels.nameLabel}</label>
        <input
          id="rev-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          maxLength={80}
        />
      </div>

      {/* Honeypot: hidden from humans, tempting for bots. */}
      <div className="review-hp" aria-hidden="true">
        <label htmlFor="rev-website">Website</label>
        <input
          id="rev-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="field">
        <label id="rev-rating-label">{labels.reviewRatingLabel}</label>
        <div
          className="star-row"
          role="radiogroup"
          aria-labelledby="rev-rating-label"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}/5`}
              className={`star-btn${n <= shown ? " lit" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="rev-message">{labels.reviewMessageLabel}</label>
        <textarea
          id="rev-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={labels.reviewMessagePlaceholder}
          rows={4}
          maxLength={1500}
        />
      </div>

      {showRequired && <p className="error">{labels.errRequired}</p>}
      {state === "error" && <p className="error">{labels.reviewSendError}</p>}

      <button type="submit" className="btn" disabled={state === "sending"}>
        {state === "sending" ? <span className="spinner" /> : null} {labels.reviewSubmit}
      </button>
    </form>
  );
}
