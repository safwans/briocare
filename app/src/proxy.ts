import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

// Site-wide demo gate. In Next 16 this file convention is `proxy`, not `middleware` — the
// middleware name is deprecated (node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/proxy.md).
//
// Everything is behind the gate, including the public landing page: this deployment is a private
// review build, not a live marketing site.
export async function proxy(req: NextRequest) {
  if (await isValidToken(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  // Capture-ingest and simulator endpoints are called by already-authenticated pages, so they
  // carry the cookie and never reach here. If one does, it's unauthenticated — answer 401 rather
  // than redirecting, so a POST doesn't silently "succeed" by following a redirect to HTML.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Without a matcher this runs on every request including static assets, which would block the
  // login page's own CSS. Exclude build output and the login route itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};
