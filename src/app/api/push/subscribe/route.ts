import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { savePushSubscription } from "@/lib/push";

export async function POST(request: NextRequest) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ success: false, error: "ログインが必要です" }, { status: 401 });
    }

    try {
        const subscription = await request.json();
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return NextResponse.json({ success: false, error: "通知先の情報が不正です" }, { status: 400 });
        }
        await savePushSubscription(subscription);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Push subscription error", error);
        return NextResponse.json({ success: false, error: "通知を登録できませんでした" }, { status: 500 });
    }
}
