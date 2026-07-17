import { NextRequest, NextResponse } from "next/server";

// Simple HTTP Basic Auth gate so the team can reach this by URL without it
// being publicly indexable. The password lives in the SITE_PASSWORD
// environment variable (set in Vercel's project settings, never committed).
// Any username works — only the password is checked.
export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  // If no password is configured (e.g. local dev without a .env.local), skip the gate.
  if (!sitePassword) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const [, password] = decoded.split(":");
    if (password === sitePassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Fleet Dashboard"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
