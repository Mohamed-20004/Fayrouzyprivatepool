"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type NavLabels = {
  navGallery: string;
  navBook: string;
  navLocation: string;
  navReviews: string;
  navContact: string;
  reserve: string;
};

/**
 * Sticky header, transparent over the hero; once the page scrolls it gains a
 * glass blur + tint so the menu stays legible over any content beneath it.
 */
export function SiteHeader({
  locale,
  name,
  labels,
}: {
  locale: Locale;
  name: string;
  labels: NavLabels;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <Link href={`/${locale}`} className="brand">
          {name}
        </Link>
        <nav className="main-nav">
          <Link href={`/${locale}#gallery`}>{labels.navGallery}</Link>
          <Link href={`/${locale}#book`}>{labels.navBook}</Link>
          <Link href={`/${locale}#location`}>{labels.navLocation}</Link>
          <Link href={`/${locale}#reviews`}>{labels.navReviews}</Link>
          <Link href={`/${locale}#contact`}>{labels.navContact}</Link>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher current={locale} />
          <Link href={`/${locale}#book`} className="btn-reserve">
            {labels.reserve}
          </Link>
        </div>
      </div>
    </header>
  );
}
