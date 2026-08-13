import { NextRequest, NextResponse } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);

    // Desktop sessions are non-expiring or long-lived
    if (payload && (payload.isDesktop || payload.isDesktopSso)) {
      return false;
    }

    if (payload && typeof payload.exp === "number") {
      return payload.exp * 1000 <= Date.now();
    }
    return false;
  } catch (err) {
    console.error("Error decoding token in proxy:", err);
    return true;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const hasValidToken = token ? !isTokenExpired(token) : false;
  const userAgent = req.headers.get("user-agent") || "";
  const isElectron = userAgent.toLowerCase().includes("electron");

  // In Electron desktop app, NEVER show /login page
  if (isElectron && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protected routes: /dashboard and all subroutes
  if (pathname.startsWith("/dashboard")) {
    if (!hasValidToken && !isElectron) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      if (token) {
        response.cookies.delete("token");
      }
      return response;
    }
  }

  // Public auth/landing routes: /, /login, /register
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    if (hasValidToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*", "/dashboard"],
};
