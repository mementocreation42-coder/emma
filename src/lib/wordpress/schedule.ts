import { WordPressPost } from "./types";
import { WP_API_URL, getAuthHeaders, fetchCategoryIdBySlug, createPost, updatePost } from "./client";
import { CalendarEvent, OwnerId, SCHEDULE_CATEGORY_SLUG, isOwnerId } from "@/types/schedule";

/**
 * Times are wall-clock and never converted between zones: WordPress stores the
 * start in the post's own `date` column as site-local time.
 */
function toWpDate(startsAt: string): string {
    return startsAt.length === 16 ? `${startsAt}:00` : startsAt;
}

function decodeTitle(rendered: string): string {
    return rendered
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&#x27;|&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
}

/**
 * The event's structured fields live as a base64 JSON blob inside an HTML
 * comment in the post body — no ACF, no plugin, no server-side field
 * registration. The comment never renders, and schedule posts are excluded from
 * the gallery, so the body is ours to use. Base64 keeps user text (which could
 * contain "-->" or markup) from breaking the comment or the JSON.
 */
const PAYLOAD_RE = /<!--EMMA_SCHEDULE:([A-Za-z0-9+/=]+)-->/;

interface SchedulePayload {
    owner: OwnerId;
    allDay: boolean;
    place: string;
    note: string;
}

function encodePayload(p: SchedulePayload): string {
    const json = JSON.stringify({ owner: p.owner, allDay: p.allDay, place: p.place, note: p.note });
    return `<!--EMMA_SCHEDULE:${Buffer.from(json, "utf8").toString("base64")}-->`;
}

function decodePayload(content: string): SchedulePayload | null {
    const match = PAYLOAD_RE.exec(content);
    if (!match) return null;
    try {
        const parsed = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
        if (!isOwnerId(parsed?.owner)) return null;
        return {
            owner: parsed.owner,
            allDay: parsed.allDay === true,
            place: typeof parsed.place === "string" ? parsed.place : "",
            note: typeof parsed.note === "string" ? parsed.note : "",
        };
    } catch {
        return null;
    }
}

function toCalendarEvent(post: WordPressPost): CalendarEvent | null {
    // content.rendered carries the comment; content.raw only exists with auth.
    const payload = decodePayload(post.content?.rendered ?? "");
    if (!payload) return null;

    return {
        id: post.id.toString(),
        title: decodeTitle(post.title.rendered) || "(無題)",
        owner: payload.owner,
        startsAt: post.date.slice(0, 16),
        allDay: payload.allDay,
        place: payload.place,
        note: payload.note,
    };
}

/**
 * Fetch events between two local dates (inclusive of `start`, exclusive of
 * `end`), both "YYYY-MM-DD".
 */
export async function fetchCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
    const categoryId = await fetchCategoryIdBySlug(SCHEDULE_CATEGORY_SLUG);
    if (!categoryId) return [];

    // Pad the WP-side range by a day and narrow it exactly below, so a timezone
    // quirk in WP's date filtering can never drop an edge day.
    const params = new URLSearchParams({
        per_page: "100",
        // WordPress changes posts dated in the future to `future` even when
        // they were submitted as published. Calendar entries need to be shown
        // before their date arrives, so fetch all readable statuses here.
        status: "any",
        categories: categoryId.toString(),
        orderby: "date",
        order: "asc",
        after: `${shiftDays(start, -1)}T00:00:00`,
        before: `${shiftDays(end, 1)}T00:00:00`,
    });

    try {
        const response = await fetch(`${WP_API_URL}/posts?${params}`, {
            headers: getAuthHeaders(),
            next: { revalidate: 0 },
        });
        if (!response.ok) {
            console.error(`WordPress calendar fetch error: ${response.status}`);
            return [];
        }

        const posts: WordPressPost[] = await response.json();
        return posts
            .map(toCalendarEvent)
            .filter((event): event is CalendarEvent => {
                if (!event) return false;
                const day = event.startsAt.slice(0, 10);
                return day >= start && day < end;
            });
    } catch (error) {
        console.error("Failed to fetch calendar:", error);
        return [];
    }
}

export interface CalendarEventInput {
    title: string;
    owner: OwnerId;
    startsAt: string;
    allDay: boolean;
    place: string;
    note: string;
}

/** Build the CalendarEvent we just wrote, without re-parsing WP's response. */
function eventFromInput(id: string, input: CalendarEventInput): CalendarEvent {
    return {
        id,
        title: input.title,
        owner: input.owner,
        startsAt: input.startsAt.slice(0, 16),
        allDay: input.allDay,
        place: input.place,
        note: input.note,
    };
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const categoryId = await fetchCategoryIdBySlug(SCHEDULE_CATEGORY_SLUG);
    if (!categoryId) {
        throw new Error(
            `WordPress にカテゴリー "${SCHEDULE_CATEGORY_SLUG}" がありません。管理画面で作成してください。`
        );
    }

    const post = await createPost({
        title: input.title,
        content: encodePayload(input),
        date: toWpDate(input.startsAt),
        status: "publish",
        categories: [categoryId],
    });

    return eventFromInput(post.id.toString(), input);
}

export async function updateCalendarEvent(id: string, input: CalendarEventInput): Promise<CalendarEvent> {
    await updatePost(Number(id), {
        title: input.title,
        content: encodePayload(input),
        date: toWpDate(input.startsAt),
    });

    return eventFromInput(id, input);
}

/**
 * Move an event to the WordPress trash rather than deleting it.
 *
 * Nothing here is ever destroyed: trashed events drop out of the calendar
 * (which only reads `status=publish`) but stay recoverable. This is why it does
 * not reuse `deletePost`, which forces a permanent delete.
 */
export async function trashCalendarEvent(id: string): Promise<boolean> {
    const response = await fetch(`${WP_API_URL}/posts/${Number(id)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`WordPress trash error: ${response.status}`, errorText);
        throw new Error(`削除できませんでした: ${response.status}`);
    }

    return true;
}

/** Shift a "YYYY-MM-DD" string by whole days without touching the local clock. */
export function shiftDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
