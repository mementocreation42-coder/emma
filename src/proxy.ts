import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    // Check if the user is authenticated via cookie
    const isAuthenticated = request.cookies.has("auth");
    const isLoginPage = request.nextUrl.pathname === "/login";

    // Allow unrestricted access to static files, images, and API routes if needed
    if (
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/api") ||
        request.nextUrl.pathname.startsWith("/static") ||
        request.nextUrl.pathname.includes(".") // Files like favicon.ico, images, etc.
    ) {
        return NextResponse.next();
    }

    // If not authenticated and trying to access a protected page, redirect to login
    if (!isAuthenticated && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
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
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
