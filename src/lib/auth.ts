import { cookies, headers } from "next/headers";
import { verifySessionToken } from "@/lib/session";

/**
 * The proxy (middleware) excludes /api from its matcher,
 * so mutating API routes must check auth themselves.
 */
export async function isAuthenticated(): Promise<boolean> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    // CSRF guard: browsers attach an Origin header to every cross-origin
    // request (and all fetch POSTs). A present-but-foreign origin means the
    // request was not initiated by our own pages, regardless of the cookie.
    const origin = headerStore.get("origin");
    if (origin) {
        const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
        let originHost: string;
        try {
            originHost = new URL(origin).host;
        } catch {
            return false;
        }
        if (!host || originHost !== host) return false;
    }

    return verifySessionToken(cookieStore.get("auth")?.value);
}
