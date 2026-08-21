"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * Link to a section of the home page. On the home page itself it scrolls
 * smoothly WITHOUT writing the #hash into the URL — otherwise reloading or
 * reopening the tab would land the visitor mid-page. From other pages it
 * navigates normally (the hash is needed to reach the section).
 */
export function ScrollLink({
  locale,
  anchor,
  className,
  children,
}: {
  locale: Locale;
  anchor: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const home = `/${locale}`;

  return (
    <Link
      href={`${home}#${anchor}`}
      className={className}
      onClick={(e) => {
        if (pathname === home) {
          e.preventDefault();
          document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
        }
      }}
    >
      {children}
    </Link>
  );
}
