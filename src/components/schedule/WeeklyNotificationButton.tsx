"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function base64ToUint8Array(base64: string) {
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const data = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(data, (character) => character.charCodeAt(0));
}

export function WeeklyNotificationButton() {
    const [state, setState] = useState<"idle" | "loading" | "enabled" | "unsupported" | "denied" | "error">("idle");

    async function enableNotifications() {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !key) {
            setState("unsupported");
            return;
        }

        setState("loading");
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setState("denied");
                return;
            }
            const registration = await navigator.serviceWorker.register("/sw.js");
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64ToUint8Array(key),
            });
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });
            if (!response.ok) throw new Error("登録に失敗しました");
            setState("enabled");
        } catch (error) {
            console.error("Push setup error", error);
            setState("error");
        }
    }

    const label = state === "enabled"
        ? "日曜通知を設定済み"
        : state === "loading"
            ? "設定中…"
            : "日曜通知を受け取る";

    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs" disabled={state === "loading" || state === "enabled"} onClick={enableNotifications}>
                {state === "loading" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : state === "enabled" ? <Check className="mr-1 h-3 w-3" /> : <Bell className="mr-1 h-3 w-3" />}
                {label}
            </Button>
            {state === "denied" && <span className="text-xs text-muted-foreground">通知を許可してください</span>}
            {state === "unsupported" && (
                <span className="text-xs text-muted-foreground">
                    アプリ内ブラウザでは利用できません。Safari / Chromeで本番サイトを開いてください
                </span>
            )}
            {state === "error" && <span className="text-xs text-destructive">設定できませんでした</span>}
        </div>
    );
}
