import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    // Leaflet and React set inline styles at runtime; the app ships no
    // user-controlled style injection.
    "style-src 'self' 'unsafe-inline'",
    // MapTiler tiles plus arbitrary photo-thumbnail URLs supplied by the admin.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.maptiler.com${isDev ? " ws: http:" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

function applySecurityHeaders(
  response: NextResponse,
  csp: string,
  isDev: boolean
): void {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(self), camera=(), microphone=(), payment=()"
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
}

function safeRedirectTarget(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildCsp(nonce, isDev);
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(sessionCookieName())?.value;
  const isAdmin = await verifySessionToken(token);

  // Defence in depth: API handlers also enforce this, but rejecting early
  // avoids ever touching the data file for unauthenticated writes.
  const isWriteApi =
    (pathname.startsWith("/api/hikes") && !SAFE_METHODS.has(request.method)) ||
    pathname.startsWith("/api/export");

  if (isWriteApi && !isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (pathname === "/login" && isAdmin) {
    const target = safeRedirectTarget(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(target, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, csp, isDev);

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|svg|webp|ico|txt|webmanifest)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
