import { NextRequest, NextResponse } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    
    // Replace base64url characters
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);

    if (payload && typeof payload.exp === "number") {
      return payload.exp * 1000 <= Date.now();
    }
    return false;
  } catch (err) {
    console.error("Error decoding token in proxy:", err);
    return true; // Treat invalid token structure as expired
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("token")?.value;

    if (!token || isTokenExpired(token)) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard"],
};
