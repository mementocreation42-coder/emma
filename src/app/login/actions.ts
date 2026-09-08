"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Redis } from "@upstash/redis";
import { createSessionToken, safeEqual, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

function redis(): Redis | null {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null; // local dev without KV: skip rate limiting
    return new Redis({ url, token });
}

async function clientIp(): Promise<string> {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return headerStore.get("x-real-ip") ?? "unknown";
}

export async function login(prevState: { error?: string }, formData: FormData) {
    const password = formData.get("password");
    const sitePassword = process.env.SITE_PASSWORD;

    if (typeof password !== "string" || !sitePassword) {
        return { error: "Incorrect password" };
    }

    // Brute-force guard: count failures per IP in a rolling window.
    const store = redis();
    const rateKey = `login:fail:${await clientIp()}`;
    if (store) {
        try {
            const failures = await store.get<number>(rateKey);
            if (failures !== null && failures >= MAX_ATTEMPTS) {
                return { error: "Too many attempts. Please try again later." };
            }
        } catch (error) {
            console.error("Login rate-limit check failed", error);
        }
    }

    if (await safeEqual(password, sitePassword)) {
        const token = await createSessionToken();
        if (!token) return { error: "Incorrect password" };

        if (store) {
            try {
                await store.del(rateKey);
            } catch {
                // Best-effort reset; the window expires on its own.
            }
        }

        const cookieStore = await cookies();
        cookieStore.set("auth", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE_SECONDS,
            path: "/",
        });
        redirect("/");
    }

    if (store) {
        try {
            const failures = await store.incr(rateKey);
            if (failures === 1) await store.expire(rateKey, WINDOW_SECONDS);
        } catch (error) {
            console.error("Login rate-limit update failed", error);
        }
    }

    return { error: "Incorrect password" };
}

/** Clears the session cookie on this device and returns to the login page. */
export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("auth");
    redirect("/login");
}
