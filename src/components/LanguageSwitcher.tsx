"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

/** Visible on every page; swaps the locale prefix of the current path. */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() || `/${current}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav className="lang-switcher" aria-label="Language">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          className={l === current ? "active" : ""}
          lang={l}
        >
          {localeNames[l]}
        </Link>
      ))}
    </nav>
  );
}
