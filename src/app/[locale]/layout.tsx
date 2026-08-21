import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/styles/globals.css";
import { chaletConfig } from "@/config/chalet.config";
import { dirFor, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SiteHeader } from "@/components/SiteHeader";
import {
  IconClock,
  IconFacebook,
  IconInstagram,
  IconMail,
  IconPhone,
  IconPin,
  IconYoutube,
} from "@/components/Icons";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");
  return {
    title: chaletConfig.name,
    description: dict.tagline,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const { contact, location, slots } = chaletConfig;

  const slotTimesLine = `${dict.daySlot} ${slots.day.start}–${slots.day.end} · ${dict.nightSlot} ${slots.night.start}–${slots.night.end}`;

  return (
    <html lang={l} dir={dirFor(l)}>
      <body>
        <SiteHeader
          locale={l}
          name={chaletConfig.name}
          labels={{
            navGallery: dict.navGallery,
            navBook: dict.navBook,
            navLocation: dict.navLocation,
            navReviews: dict.navReviews,
            navContact: dict.navContact,
            reserve: dict.reserve,
          }}
        />

        <main>{children}</main>

        <footer className="site-footer" id="contact">
          <div className="container">
            <div className="footer-grid">
              <div>
                <p className="footer-brand">{chaletConfig.name}</p>
                <p className="footer-blurb">{dict.footerBlurb}</p>
                <p className="footer-caps">{location.shortAddress}</p>
              </div>

              <div>
                <p className="footer-heading">{dict.getInTouch}</p>
                <a className="footer-item" href={`tel:${chaletConfig.phone.replace(/\s/g, "")}`}>
                  <span className="footer-icon">
                    <IconPhone />
                  </span>
                  <span className="value" dir="ltr">
                    {chaletConfig.phone}
                  </span>
                </a>
                <a className="footer-item" href={`mailto:${contact.email}`}>
                  <span className="footer-icon">
                    <IconMail />
                  </span>
                  <span className="value">{contact.email}</span>
                </a>
                <a
                  className="footer-item"
                  href={location.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-icon">
                    <IconPin />
                  </span>
                  <span className="value">{location.address}</span>
                </a>
              </div>

              <div>
                <p className="footer-heading">{dict.followAlong}</p>
                <a
                  className="footer-item"
                  href={contact.instagram.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-icon">
                    <IconInstagram />
                  </span>
                  <span>
                    <span className="label">Instagram</span>
                    <span className="value">{contact.instagram.handle}</span>
                  </span>
                </a>
                <a
                  className="footer-item"
                  href={contact.facebook.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-icon">
                    <IconFacebook />
                  </span>
                  <span>
                    <span className="label">Facebook</span>
                    <span className="value">{contact.facebook.handle}</span>
                  </span>
                </a>
                <a
                  className="footer-item"
                  href={contact.youtube.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-icon">
                    <IconYoutube />
                  </span>
                  <span>
                    <span className="label">YouTube</span>
                    <span className="value">{contact.youtube.handle}</span>
                  </span>
                </a>
              </div>
            </div>

            <div className="footer-bottom">
              <span>
                © {new Date().getFullYear()} {chaletConfig.name}. {dict.rightsReserved}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <IconClock /> <span dir="ltr">{slotTimesLine}</span>
              </span>
              <span>{location.shortAddress}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
