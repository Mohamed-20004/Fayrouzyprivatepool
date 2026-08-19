import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/styles/globals.css";
import { chaletConfig } from "@/config/chalet.config";
import { dirFor, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";

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

  return (
    <html lang={l} dir={dirFor(l)}>
      <body>
        <header className="site-header">
          <div className="container">
            <Link href={`/${l}`} className="brand">
              <Logo />
              {chaletConfig.name}
            </Link>
            <LanguageSwitcher current={l} />
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p>
              {chaletConfig.name} · {chaletConfig.location.address} ·{" "}
              <span dir="ltr">{chaletConfig.phone}</span>
            </p>
            <p>{dict.seasonNote}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
