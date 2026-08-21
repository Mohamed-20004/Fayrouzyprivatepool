import { notFound } from "next/navigation";
import { chaletConfig } from "@/config/chalet.config";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BrandLockup } from "@/components/BrandLockup";
import { ScrollLink } from "@/components/ScrollLink";
import { GallerySection } from "@/components/GallerySection";
import { BookingSection } from "@/components/BookingSection";
import {
  IconBed,
  IconKitchen,
  IconLeaf,
  IconPin,
  IconPool,
  IconSofa,
  IconWifi,
} from "@/components/Icons";
import { defaultCalendarMonth } from "@/lib/availability";
import { todayInChaletTz } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);

  const today = todayInChaletTz();
  const minMonth = today.slice(0, 7);
  const maxMonth = `${Number(today.slice(0, 4)) + 1}-${String(
    chaletConfig.season.endMonth
  ).padStart(2, "0")}`;

  const fromPrice = Math.min(...Object.values(chaletConfig.prices));
  const { lat, lng } = chaletConfig.location;
  const bbox = `${lng - 0.02},${lat - 0.012},${lng + 0.02},${lat + 0.012}`;

  const amenities = [
    { icon: <IconPool />, label: dict.amenPool },
    { icon: <IconLeaf />, label: dict.amenViews },
    { icon: <IconKitchen />, label: dict.amenKitchen },
    { icon: <IconBed />, label: dict.amenSuites },
    { icon: <IconSofa />, label: dict.amenLiving },
    { icon: <IconWifi />, label: dict.amenWifi },
  ];

  const included = [
    dict.inc1,
    dict.inc2,
    dict.inc3,
    dict.inc4,
    dict.inc5,
    dict.inc6,
    dict.inc7,
  ];

  return (
    <>
      {/* ── Hero ── */}
      <div className="hero">
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${chaletConfig.heroImage})` }}
        />
        <div className="container">
          <div className="hero-inner">
            <span className="hero-eyebrow">{dict.heroEyebrow}</span>
            <h1 className="hero-title">
              <BrandLockup name={chaletConfig.name} variant="hero" />
            </h1>
            <p className="hero-lead">{dict.tagline}</p>
            <div className="hero-ctas">
              <ScrollLink locale={l} anchor="book" className="btn">
                {dict.ctaReserve}
              </ScrollLink>
              <ScrollLink locale={l} anchor="gallery" className="btn btn-secondary">
                {dict.ctaExplore}
              </ScrollLink>
            </div>
          </div>
        </div>
        <span className="hero-scroll">{dict.scrollHint}</span>
      </div>

      {/* ── Amenities strip ── */}
      <div className="amenities">
        <div className="container" style={{ padding: 0 }}>
          <div className="amenities-row">
            {amenities.map((a) => (
              <span className="amenity" key={a.label}>
                {a.icon}
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gallery ── */}
      <section id="gallery">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">{dict.gallery}</span>
              <h2 className="display">
                {dict.galleryTitle1}
                <br />
                {dict.galleryTitle2}
              </h2>
            </div>
          </div>
          <GallerySection pairs={chaletConfig.gallery} labels={dict} />
        </div>
      </section>

      {/* ── Booking ── */}
      <section id="book">
        <div className="container">
          <span className="eyebrow">{dict.bookEyebrow}</span>
          <h2 className="display">
            {dict.bookTitle1}
            <br />
            {dict.bookTitle2}
          </h2>
          <p className="price-line">
            {dict.fromWord}{" "}
            <strong>
              {fromPrice} {chaletConfig.currency}
            </strong>{" "}
            · {dict.instantConfirmation}
          </p>
          <BookingSection
            locale={l}
            labels={{ ...dict, included }}
            currency={chaletConfig.currency}
            initialMonth={defaultCalendarMonth()}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />
          <p className="note" style={{ marginTop: "var(--space-4)" }}>
            {dict.seasonNote} {dict.calendarHint}
          </p>
        </div>
      </section>

      {/* ── Location ── */}
      <section id="location">
        <div className="container">
          <span className="eyebrow">{dict.locationEyebrow}</span>
          <h2 className="display">
            {dict.locationTitle1}
            <br />
            {dict.locationTitle2}
          </h2>
          <p className="section-lead">{dict.locationLead}</p>

          <dl className="spec-table">
            <div className="spec-row">
              <dt>{dict.specAddress}</dt>
              <dd>{chaletConfig.location.address}</dd>
            </div>
            <div className="spec-row">
              <dt>{dict.specCoordinates}</dt>
              <dd dir="ltr">{chaletConfig.location.coordinatesLabel}</dd>
            </div>
            {chaletConfig.location.altitude && (
              <div className="spec-row">
                <dt>{dict.specAltitude}</dt>
                <dd dir="ltr">{chaletConfig.location.altitude}</dd>
              </div>
            )}
            <div className="spec-row">
              <dt>{dict.specDistances}</dt>
              <dd>{chaletConfig.location.distances}</dd>
            </div>
          </dl>

          {chaletConfig.location.showEmbeddedMap && (
            <iframe
              className="map-frame"
              title={dict.location}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
              loading="lazy"
            />
          )}

          <a
            className="btn btn-secondary"
            href={chaletConfig.location.mapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          >
            <IconPin /> {dict.openInMaps}
          </a>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section id="reviews">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">{dict.reviewsEyebrow}</span>
              <h2 className="display" style={{ marginBottom: 0 }}>
                {dict.reviewsTitle1}
                <br />
                {dict.reviewsTitle2}
              </h2>
            </div>
            <div className="rating-line">
              <span className="stars" aria-hidden="true">
                ★★★★★
              </span>
              <span className="score">{chaletConfig.reviews.average}</span>
              <span className="count">
                / {chaletConfig.reviews.count} {dict.staysSuffix}
              </span>
            </div>
          </div>

          <div className="reviews-grid">
            {chaletConfig.reviews.items.map((r) => (
              <article className="review-card" key={r.initials}>
                <div className="review-head">
                  <span className="review-avatar">{r.initials}</span>
                  <span>
                    <span className="review-name">{r.name}</span>
                    <span className="review-meta" style={{ display: "block" }}>
                      {r.meta[l]}
                    </span>
                  </span>
                  <span className="stars" aria-label="5/5">
                    ★★★★★
                  </span>
                </div>
                <blockquote className="review-quote">“{r.quote[l]}”</blockquote>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
