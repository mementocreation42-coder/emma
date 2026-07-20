import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
    fetchCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    trashCalendarEvent,
    CalendarEventInput,
} from "@/lib/wordpress";
import { isAuthenticated } from "@/lib/auth";
import {
    NOTE_MAX_LENGTH,
    PLACE_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    isOwnerId,
} from "@/types/schedule";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function unauthorized() {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
    return NextResponse.json({ success: false, error }, { status: 400 });
}

function serverError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    console.error("Calendar API Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
}

function optionalText(value: unknown, max: number, label: string): string | { error: string } {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") return { error: `${label}が不正です` };
    if (value.length > max) return { error: `${label}は${max}文字までです` };
    return value.trim();
}

/** Validate and normalise a create/update payload. */
function parseInput(body: unknown): CalendarEventInput | { error: string } {
    const { title, owner, startsAt, allDay, place, note } = (body ?? {}) as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) return { error: "タイトルを入力してください" };
    if (title.length > TITLE_MAX_LENGTH) return { error: `タイトルは${TITLE_MAX_LENGTH}文字までです` };
    if (!isOwnerId(owner)) return { error: "誰の予定か選んでください" };
    if (typeof startsAt !== "string" || !DATETIME_RE.test(startsAt)) {
        return { error: "開始日時が不正です" };
    }
    if (typeof allDay !== "boolean") return { error: "終日の指定が不正です" };

    const parsedPlace = optionalText(place, PLACE_MAX_LENGTH, "場所");
    if (typeof parsedPlace !== "string") return parsedPlace;
    const parsedNote = optionalText(note, NOTE_MAX_LENGTH, "メモ");
    if (typeof parsedNote !== "string") return parsedNote;

    return {
        title: title.trim(),
        owner,
        startsAt,
        allDay,
        place: parsedPlace,
        note: parsedNote,
    };
}

export async function GET(request: NextRequest) {
    if (!(await isAuthenticated())) return unauthorized();

    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
        return badRequest("start と end は YYYY-MM-DD 形式で必要です");
    }

    const events = await fetchCalendarEvents(start, end);
    return NextResponse.json({ success: true, events });
}

export async function POST(request: NextRequest) {
    if (!(await isAuthenticated())) return unauthorized();

    try {
        const input = parseInput(await request.json());
        if ("error" in input) return badRequest(input.error);

        const event = await createCalendarEvent(input);
        revalidateTag("calendar", "max");
        return NextResponse.json({ success: true, event });
    } catch (error) {
        return serverError(error, "予定を追加できませんでした");
    }
}

export async function PATCH(request: NextRequest) {
    if (!(await isAuthenticated())) return unauthorized();

    try {
        const body = (await request.json()) ?? {};
        const id = body.id;
        if (typeof id !== "string" || !/^\d+$/.test(id)) return badRequest("id が不正です");

        const input = parseInput(body);
        if ("error" in input) return badRequest(input.error);

        const event = await updateCalendarEvent(id, input);
        revalidateTag("calendar", "max");
        return NextResponse.json({ success: true, event });
    } catch (error) {
        return serverError(error, "予定を更新できませんでした");
    }
}

export async function DELETE(request: NextRequest) {
    if (!(await isAuthenticated())) return unauthorized();

    const id = request.nextUrl.searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) return badRequest("id が不正です");

    try {
        await trashCalendarEvent(id);
        revalidateTag("calendar", "max");
        return NextResponse.json({ success: true });
    } catch (error) {
        return serverError(error, "削除できませんでした");
    }
}
