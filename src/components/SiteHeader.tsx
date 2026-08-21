"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLockup } from "@/components/BrandLockup";
import { ScrollLink } from "@/components/ScrollLink";

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
    // Always open at the top of the page: disable the browser's scroll
    // restoration on reload/revisit — unless the URL deliberately targets a
    // section via a #hash (deep links still work).
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo(0, 0);

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <Link href={`/${locale}`} className="brand">
          <BrandLockup name={name} variant="header" />
        </Link>
        <nav className="main-nav">
          <ScrollLink locale={locale} anchor="gallery">{labels.navGallery}</ScrollLink>
          <ScrollLink locale={locale} anchor="book">{labels.navBook}</ScrollLink>
          <ScrollLink locale={locale} anchor="location">{labels.navLocation}</ScrollLink>
          <ScrollLink locale={locale} anchor="reviews">{labels.navReviews}</ScrollLink>
          <ScrollLink locale={locale} anchor="contact">{labels.navContact}</ScrollLink>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher current={locale} />
          <ScrollLink locale={locale} anchor="book" className="btn-reserve">
            {labels.reserve}
          </ScrollLink>
        </div>
      </div>
    </header>
  );
}
