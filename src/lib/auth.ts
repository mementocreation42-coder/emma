import { cookies } from "next/headers";

/**
 * The proxy (middleware) excludes /api from its matcher,
 * so mutating API routes must check auth themselves.
 */
export async function isAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.has("auth");
}
