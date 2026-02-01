import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check logic
    const authCookie = request.cookies.get("auth");
    const { pathname } = request.nextUrl;

    // Allow access to login page and public assets
    if (
        pathname === "/login" ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/static") ||
        pathname.includes("favicon")
    ) {
        return NextResponse.next();
    }

    // Rewrite root to protected content logic (or just allow if authenticated)
    // If no cookie, redirect to login
    if (!authCookie || authCookie.value !== "true") {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
