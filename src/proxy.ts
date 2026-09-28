import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present?) — real authorization happens in
// src/lib/dal.ts, next to the data.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
