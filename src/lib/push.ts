import { Redis } from "@upstash/redis";
import webpush, { type PushSubscription } from "web-push";

const SUBSCRIPTIONS_KEY = "weekly-schedule:subscriptions";

export type BrowserPushSubscription = PushSubscription;

function required(name: "KV_REST_API_URL" | "KV_REST_API_TOKEN"): string {
    const value = process.env[name];
    if (!value) throw new Error(`通知機能の環境変数 ${name} が設定されていません`);
    return value;
}

export function pushIsConfigured(): boolean {
    return Boolean(
        process.env.KV_REST_API_URL &&
        process.env.KV_REST_API_TOKEN &&
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
    );
}

function redis() {
    return new Redis({
        url: required("KV_REST_API_URL"),
        token: required("KV_REST_API_TOKEN"),
    });
}

function configureWebPush() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) throw new Error("Web Pushの鍵が設定されていません");
    webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function savePushSubscription(subscription: BrowserPushSubscription) {
    if (!pushIsConfigured()) throw new Error("通知機能はまだ準備中です");
    await redis().sadd(SUBSCRIPTIONS_KEY, JSON.stringify(subscription));
}

export async function sendWeeklyScheduleNotification(body: string) {
    if (!pushIsConfigured()) throw new Error("通知機能はまだ準備中です");

    configureWebPush();
    const subscriptions = await redis().smembers<string[]>(SUBSCRIPTIONS_KEY);
    const payload = JSON.stringify({
        title: "今週の予定",
        body,
        url: "/schedule",
    });

    const results = await Promise.allSettled(
        subscriptions.map(async (serialized) => {
            try {
                await webpush.sendNotification(JSON.parse(serialized) as BrowserPushSubscription, payload);
            } catch (error) {
                const statusCode = typeof error === "object" && error && "statusCode" in error
                    ? (error as { statusCode?: number }).statusCode
                    : undefined;
                // Expired or revoked browser subscriptions should not keep being retried.
                if (statusCode === 404 || statusCode === 410) await redis().srem(SUBSCRIPTIONS_KEY, serialized);
                throw error;
            }
        })
    );

    return {
        sent: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
    };
}
