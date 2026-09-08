import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

// Public static assets: matched by extension, not by "contains a dot", so a
// page path with a stray dot can no longer slip past the login check.
const STATIC_FILE_RE = /\.(?:ico|png|jpe?g|gif|svg|webp|avif|mp4|webm|js|css|map|json|txt|xml|webmanifest|woff2?)$/i;

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // API routes check auth themselves (they need JSON 401s, not redirects)
    if (
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next/static") ||
        pathname.startsWith("/static") ||
        STATIC_FILE_RE.test(pathname)
    ) {
        return NextResponse.next();
    }

    // The image optimizer proxies the (private) WordPress originals, so it must
    // not be an anonymous way to fetch family photos by URL.
    // NOTE: effective when self-hosting only. On Vercel, /_next/image is served
    // by the platform's image optimization layer before middleware runs
    // (verified 2026-09-08: an uncached size returned 200 without a cookie).
    if (pathname.startsWith("/_next/image")) {
        const ok = await verifySessionToken(request.cookies.get("auth")?.value);
        return ok ? NextResponse.next() : new NextResponse(null, { status: 401 });
    }

    if (pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    // The cookie must carry a valid signed token — presence alone proves
    // nothing, since anyone can hand-craft a cookie header.
    const isAuthenticated = await verifySessionToken(request.cookies.get("auth")?.value);
    const isLoginPage = pathname === "/login";

    // If not authenticated and trying to access a protected page, redirect to login
    if (!isAuthenticated && !isLoginPage) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        // Drop any stale/forged cookie so the browser stops resending it
        if (request.cookies.has("auth")) response.cookies.delete("auth");
        return response;
    }

    // If authenticated and trying to access login page, redirect to home
    if (isAuthenticated && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - favicon.ico (favicon file)
         * _next/image stays in: it is gated behind the session cookie above.
         */
        "/((?!api|_next/static|favicon.ico).*)",
    ],
};
