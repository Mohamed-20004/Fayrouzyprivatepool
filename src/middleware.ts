import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales } from "@/i18n/config";

/** Redirect bare paths to a locale-prefixed URL (Accept-Language aware). */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  // Honour the browser's language preference order.
  const header = request.headers.get("accept-language") || "";
  const wanted = header
    .toLowerCase()
    .split(",")
    .map((part) => part.trim().split(";")[0].split("-")[0]);
  const preferred =
    wanted.find((w) => (locales as readonly string[]).includes(w)) ||
    defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next|mock-checkout|favicon.ico|gallery|.*\\..*).*)"],
};
