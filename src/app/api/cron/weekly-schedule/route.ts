import { NextRequest, NextResponse } from "next/server";
import { fetchCalendarEvents, shiftDays } from "@/lib/wordpress";
import { dayOf, ownerLabel } from "@/types/schedule";
import { sendWeeklyScheduleNotification } from "@/lib/push";

function tokyoDate(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    try {
        const today = tokyoDate();
        const sunday = shiftDays(today, -new Date(`${today}T00:00:00Z`).getUTCDay());
        const nextSunday = shiftDays(sunday, 7);
        const events = await fetchCalendarEvents(sunday, nextSunday);
        const body = events.length === 0
            ? "今週の予定はありません"
            : events.map((event) => `${Number(dayOf(event.startsAt).slice(5, 7))}/${Number(dayOf(event.startsAt).slice(8, 10))} ${ownerLabel(event.owner)}：${event.title}`).join(" ・ ");
        const result = await sendWeeklyScheduleNotification(body);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Weekly schedule notification error", error);
        return NextResponse.json({ success: false, error: "通知を送信できませんでした" }, { status: 500 });
    }
}
