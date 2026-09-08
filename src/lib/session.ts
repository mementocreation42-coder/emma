/**
 * Signed session tokens. Uses Web Crypto only, so the same code runs in the
 * proxy (middleware) and in Node route handlers / server actions.
 *
 * The cookie value is "<issuedAt>.<HMAC-SHA256(secret, context.issuedAt)>" —
 * unforgeable without the secret, expires SESSION_MAX_AGE_SECONDS after issue
 * (so a leaked cookie stops working on its own), and invalidated everywhere
 * by rotating AUTH_SECRET (or the site password when no dedicated secret is set).
 */

const TOKEN_CONTEXT = "emma-web-session-v2";

/** Shared by the cookie's maxAge and the token's own expiry check. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretMaterial(): string | null {
    return process.env.AUTH_SECRET || process.env.SITE_PASSWORD || null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

/** Constant-time equality. Hashes both sides first so length never leaks. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const [digestA, digestB] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(a)),
        crypto.subtle.digest("SHA-256", encoder.encode(b)),
    ]);
    const bytesA = new Uint8Array(digestA);
    const bytesB = new Uint8Array(digestB);
    let diff = 0;
    for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
    return diff === 0;
}

/** The value stored in the auth cookie. Null when no secret is configured. */
export async function createSessionToken(now: number = Date.now()): Promise<string | null> {
    const secret = secretMaterial();
    if (!secret) return null;
    const issuedAt = Math.floor(now / 1000).toString();
    const signature = await hmacHex(secret, `${TOKEN_CONTEXT}.${issuedAt}`);
    return `${issuedAt}.${signature}`;
}

/**
 * Fails closed: no secret, no/garbage cookie value, bad signature, or a token
 * older than SESSION_MAX_AGE_SECONDS (or from the future) → not authenticated.
 */
export async function verifySessionToken(token: string | undefined | null, now: number = Date.now()): Promise<boolean> {
    if (!token) return false;
    const secret = secretMaterial();
    if (!secret) return false;

    const dot = token.indexOf(".");
    if (dot <= 0) return false;
    const issuedAtRaw = token.slice(0, dot);
    const signature = token.slice(dot + 1);
    if (!/^\d{1,12}$/.test(issuedAtRaw) || !signature) return false;

    const issuedAt = Number(issuedAtRaw);
    const nowSeconds = Math.floor(now / 1000);
    // Small clock-skew allowance for the "from the future" check
    if (issuedAt > nowSeconds + 60) return false;
    if (nowSeconds - issuedAt > SESSION_MAX_AGE_SECONDS) return false;

    const expected = await hmacHex(secret, `${TOKEN_CONTEXT}.${issuedAtRaw}`);
    return safeEqual(signature, expected);
}
