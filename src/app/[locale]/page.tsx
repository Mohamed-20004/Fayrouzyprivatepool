import { notFound } from "next/navigation";
import { chaletConfig } from "@/config/chalet.config";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Calendar } from "@/components/Calendar";
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

  const { lat, lng } = chaletConfig.location;
  const bbox = `${lng - 0.02},${lat - 0.012},${lng + 0.02},${lat + 0.012}`;

  return (
    <>
      <div className="hero">
        <div className="container">
          <h1>{chaletConfig.name}</h1>
          <p>{dict.tagline}</p>
          <a className="btn" href="#calendar">
            {dict.bookNow}
          </a>
        </div>
      </div>

      <section id="gallery">
        <div className="container">
          <h2>{dict.gallery}</h2>
          <div className="gallery-grid">
            {chaletConfig.gallery.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.src} src={img.src} alt={img.alt} loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      <section id="calendar">
        <div className="container">
          <h2>{dict.calendarTitle}</h2>
          <p style={{ color: "var(--color-text-muted)" }}>{dict.calendarHint}</p>
          <Calendar
            locale={l}
            labels={dict}
            currency={chaletConfig.currency}
            initialMonth={defaultCalendarMonth()}
            minMonth={minMonth}
            maxMonth={maxMonth}
          />
          <p className="note">{dict.seasonNote}</p>
        </div>
      </section>

      <section id="location">
        <div className="container">
          <h2>{dict.location}</h2>
          <iframe
            className="map-frame"
            title={dict.location}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
            loading="lazy"
          />
          <p>
            {chaletConfig.location.address} ·{" "}
            <a href={chaletConfig.location.mapsUrl} target="_blank" rel="noreferrer">
              {dict.openInMaps}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
