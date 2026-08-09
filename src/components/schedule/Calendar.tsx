"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GLASS_PANEL } from "@/components/layout/AuroraBackground";
import { WeeklyNotificationButton } from "@/components/schedule/WeeklyNotificationButton";
import {
    CalendarEvent,
    EVENT_PRESETS,
    NOTE_MAX_LENGTH,
    OWNERS,
    OwnerId,
    PLACE_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    dayOf,
    ownerLabel,
    timeOf,
} from "@/types/schedule";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SUNDAY = 0;
const SATURDAY = 6;

type HolidaysByDate = Record<string, string>;

// holidays-jp publishes the official Japanese public-holiday calendar as a
// compact date-to-name map. Keeping it separate from family events means a
// holiday can never accidentally be edited or deleted from the CMS.
const HOLIDAYS_API_URL = "https://holidays-jp.github.io/api/v1/date.json";

/**
 * Amber for 家族 rather than a green: the sage `--primary` already means
 * "today", so a second green would read as the same signal.
 */
const OWNER_STYLES: Record<OwnerId, string> = {
    husband: "bg-sky-100 text-sky-800 border-sky-600/25 dark:bg-sky-500/15 dark:text-sky-300",
    wife: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-600/25 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    ema: "bg-violet-100 text-violet-800 border-violet-600/25 dark:bg-violet-500/15 dark:text-violet-300",
    family: "bg-amber-100 text-amber-800 border-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300",
};

/** Solid dot per owner — the mobile stand-in for a full event tag. */
const OWNER_DOTS: Record<OwnerId, string> = {
    husband: "bg-sky-500",
    wife: "bg-fuchsia-500",
    ema: "bg-violet-500",
    family: "bg-amber-500",
};

const NURSERY_STYLE = "bg-emerald-500/15 text-emerald-800 border-emerald-600/25 dark:text-emerald-300";
const NURSERY_DOT = "bg-emerald-500";

function isNurseryEvent(event: CalendarEvent): boolean {
    return event.place.includes("認可保育園おひさま") || event.place.includes("認可保育園ひひさま");
}

function eventStyle(event: CalendarEvent): string {
    return isNurseryEvent(event) ? NURSERY_STYLE : OWNER_STYLES[event.owner];
}

function eventDot(event: CalendarEvent): string {
    return isNurseryEvent(event) ? NURSERY_DOT : OWNER_DOTS[event.owner];
}

function toDateKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

/** Sunday-based index, matching WEEKDAYS and JS's own getDay(). */
function weekdayIndex(date: Date): number {
    return date.getDay();
}

/**
 * The 6x7 grid a month view always shows, starting on the Sunday on or before
 * the 1st. Fixed at 6 rows so the grid never changes height between months.
 */
function monthGridDays(monthStart: Date): Date[] {
    const gridStart = addDays(monthStart, -weekdayIndex(monthStart));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Local midnight of the Sunday on or before `date`. */
function weekStartOf(date: Date): Date {
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return addDays(midnight, -weekdayIndex(midnight));
}

/** The seven days of the week beginning at `weekStart` (a Sunday). */
function weekGridDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "7/13" style short label. */
function shortDate(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

type ViewMode = "month" | "week";

interface CalendarProps {
    initialEvents: CalendarEvent[];
    initialMonthStart: string;
}

export function Calendar({ initialEvents, initialMonthStart }: CalendarProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [monthStart, setMonthStart] = useState(() => new Date(`${initialMonthStart}T00:00:00`));
    // Week view anchors on the week containing today, independent of the month.
    const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<CalendarEvent | null>(null);
    const [composingDay, setComposingDay] = useState<string | null>(null);
    // Tapping a day opens a read-only view of that day first; adding is an
    // explicit step from there, so a stray tap can't drop you into a form.
    const [viewingDay, setViewingDay] = useState<string | null>(() => toDateKey(new Date()));
    const [showUpcoming, setShowUpcoming] = useState(true);
    const [holidays, setHolidays] = useState<HolidaysByDate>({});

    const days = viewMode === "month" ? monthGridDays(monthStart) : weekGridDays(weekStart);
    const rangeStart = toDateKey(days[0]);
    const rangeEnd = toDateKey(addDays(days[days.length - 1], 1));
    const todayKey = toDateKey(new Date());
    // Show a full week (today plus the following six days) whenever the
    // schedule opens, rather than the previous three-day preview.
    const upcomingEndKey = toDateKey(addDays(new Date(), 6));
    const thisWeekStartKey = toDateKey(weekStartOf(new Date()));
    const thisWeekEndKey = toDateKey(addDays(weekStartOf(new Date()), 7));
    const nextWeekStartKey = thisWeekEndKey;
    const nextWeekEndKey = toDateKey(addDays(weekStartOf(new Date()), 14));
    const thisWeekLastDay = addDays(new Date(`${thisWeekEndKey}T00:00:00`), -1);
    const nextWeekLastDay = addDays(new Date(`${nextWeekEndKey}T00:00:00`), -1);
    const thisWeekEvents = events
        .filter((event) => {
            const day = dayOf(event.startsAt);
            return day >= thisWeekStartKey && day < thisWeekEndKey;
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const nextWeekEvents = events
        .filter((event) => {
            const day = dayOf(event.startsAt);
            return day >= nextWeekStartKey && day < nextWeekEndKey;
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const upcomingEvents = events
        .filter((event) => {
            const date = dayOf(event.startsAt);
            return date >= todayKey && date <= upcomingEndKey;
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    useEffect(() => {
        const controller = new AbortController();

        fetch(HOLIDAYS_API_URL, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error("祝日を読み込めませんでした");
                return response.json() as Promise<HolidaysByDate>;
            })
            .then(setHolidays)
            // The calendar remains usable even if the public holiday source is
            // temporarily unavailable, so this is intentionally non-blocking.
            .catch((fetchError: unknown) => {
                if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
                console.warn("Failed to load Japanese public holidays", fetchError);
            });

        return () => controller.abort();
    }, []);

    const load = useCallback(async (start: string, end: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/schedule?start=${start}&end=${end}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setEvents(data.events);
        } catch (e) {
            setError(e instanceof Error ? e.message : "読み込めませんでした");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refetch whenever the visible range changes (month paging, week paging, or
    // switching views). The month the server already rendered is pre-seeded so
    // it doesn't trigger a redundant first fetch.
    const initialMonth = monthGridDays(new Date(`${initialMonthStart}T00:00:00`));
    const [loadedRange, setLoadedRange] = useState(
        `${toDateKey(initialMonth[0])}_${toDateKey(addDays(initialMonth[41], 1))}`
    );
    useEffect(() => {
        const rangeKey = `${rangeStart}_${rangeEnd}`;
        if (rangeKey === loadedRange) return;
        setLoadedRange(rangeKey);
        load(rangeStart, rangeEnd);
    }, [rangeStart, rangeEnd, loadedRange, load]);

    function shiftMonth(delta: number) {
        setMonthStart((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    }

    function shiftWeek(delta: number) {
        setWeekStart((current) => addDays(current, delta * 7));
    }

    // Prev/next and "today" act on whichever view is active.
    function goPrev() {
        if (viewMode === "month") shiftMonth(-1);
        else shiftWeek(-1);
    }
    function goNext() {
        if (viewMode === "month") shiftMonth(1);
        else shiftWeek(1);
    }
    function goToday() {
        const now = new Date();
        if (viewMode === "month") setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
        else setWeekStart(weekStartOf(now));
    }

    async function remove(id: string) {
        const previous = events;
        const removed = events.find((e) => e.id === id);
        setEvents((current) => current.filter((e) => e.id !== id));
        setEditing(null);
        // Drop back to the day view so the deletion is visibly confirmed.
        if (removed) setViewingDay(dayOf(removed.startsAt));
        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
        } catch (e) {
            setEvents(previous);
            setError(e instanceof Error ? e.message : "削除できませんでした");
        }
    }

    function upsert(event: CalendarEvent) {
        setEvents((current) => {
            const without = current.filter((e) => e.id !== event.id);
            const day = dayOf(event.startsAt);
            return day >= rangeStart && day < rangeEnd ? [...without, event] : without;
        });
        setEditing(null);
        setComposingDay(null);
        // Land on the day view so the saved event is visibly in its list.
        setViewingDay(dayOf(event.startsAt));
        setError(null);
    }

    const isFormOpen = editing !== null || composingDay !== null;
    const isDialogOpen = isFormOpen;

    // Escape and overlay clicks are handled by the Sheet itself via onOpenChange.
    const closeForm = useCallback(() => {
        setEditing(null);
        setComposingDay(null);
        setViewingDay(null);
    }, []);

    // Cancel inside a form steps back to the day view instead of closing the
    // dialog outright; Escape/overlay/X still close everything via closeForm.
    const backToDayView = useCallback(() => {
        setViewingDay((current) => {
            if (composingDay) return composingDay;
            if (editing) return dayOf(editing.startsAt);
            return current;
        });
        setEditing(null);
        setComposingDay(null);
    }, [composingDay, editing]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {/* Month / week toggle. */}
                    <div className="flex rounded-full border border-border p-0.5 text-xs">
                        {(["month", "week"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                aria-pressed={viewMode === mode}
                                className={cn(
                                    "rounded-full px-3 py-1 transition-colors",
                                    viewMode === mode
                                        ? "bg-violet-300/75 text-violet-950 dark:bg-violet-400/35 dark:text-violet-50"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {mode === "month" ? "月" : "週"}
                            </button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={goPrev} aria-label={viewMode === "month" ? "前の月" : "前の週"}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-36 text-center text-xl font-bold tracking-tight sm:text-2xl">
                        {viewMode === "month"
                            ? `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`
                            : `${shortDate(days[0])} 〜 ${shortDate(days[6])}`}
                    </div>
                    <Button variant="ghost" size="icon" onClick={goNext} aria-label={viewMode === "month" ? "次の月" : "次の週"}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
                        {viewMode === "month" ? "今月" : "今週"}
                    </Button>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {OWNERS.map((owner) => (
                            <span key={owner.id} className="flex items-center gap-1">
                                <span className={cn("h-2 w-2 rounded-full border", OWNER_STYLES[owner.id])} />
                                {owner.label}
                            </span>
                        ))}
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full border border-emerald-600/25 bg-emerald-500" />
                            保育所
                        </span>
                    </div>
                    <Button size="sm" className="text-xs" onClick={() => setComposingDay(toDateKey(new Date()))}>
                        <Plus className="mr-1 h-3 w-3" />
                        予定を追加
                    </Button>
                    <WeeklyNotificationButton />
                </div>
            </div>

            {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            <Dialog open={showUpcoming && upcomingEvents.length > 0} onOpenChange={setShowUpcoming}>
                <DialogContent className="rounded-2xl data-[state=open]:slide-in-from-bottom-4 data-[state=open]:duration-300 data-[state=closed]:slide-out-to-bottom-2 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold tracking-wide">今後1週間の予定</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {Number(todayKey.slice(5, 7))}/{Number(todayKey.slice(8, 10))}〜{Number(upcomingEndKey.slice(5, 7))}/{Number(upcomingEndKey.slice(8, 10))}
                    </p>
                    <ul className="space-y-2">
                        {upcomingEvents.map((event) => (
                            <li key={event.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", eventStyle(event))}>
                                <span className="shrink-0 font-mono text-xs tabular-nums">
                                    {Number(dayOf(event.startsAt).slice(5, 7))}/{Number(dayOf(event.startsAt).slice(8, 10))}
                                    {event.allDay ? " 終日" : ` ${timeOf(event.startsAt)}`}
                                </span>
                                <span className="font-medium">{event.title}</span>
                            </li>
                        ))}
                    </ul>
                </DialogContent>
            </Dialog>

            {/* A dialog, not an inline panel: an inline form pushed the grid down by
                its own height, so the day you just clicked slid out from under the
                cursor and the form opened off-screen when scrolled. */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeForm();
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold tracking-wide">
                            {editing
                                ? "予定を編集"
                                : composingDay
                                    ? `${Number(composingDay.slice(5, 7))}/${Number(composingDay.slice(8, 10))} に予定を追加`
                                    : viewingDay
                                        ? `${Number(viewingDay.slice(5, 7))}/${Number(viewingDay.slice(8, 10))} の予定`
                                        : "予定"}
                        </DialogTitle>
                    </DialogHeader>

                    {isFormOpen && (
                        <EventForm
                            key={editing?.id ?? composingDay ?? "new"}
                            event={editing}
                            defaultDay={composingDay ?? toDateKey(new Date())}
                            onSaved={upsert}
                            onDelete={editing ? () => remove(editing.id) : undefined}
                            onCancel={backToDayView}
                            onError={setError}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {viewMode === "month" && (
            <div>
                {/* Translucent, not opaque: the grid should carry the page's colour
                    rather than sit on it as a white sheet. No fixed min-width: seven
                    columns must fit a phone, so mobile cells show dots, not tags. */}
                <div className={cn(GLASS_PANEL, "overflow-hidden bg-white/70 dark:bg-neutral-900/60")}>
                    <div className="grid grid-cols-7 border-b border-white/40 bg-white/25 dark:border-white/10">
                        {WEEKDAYS.map((label, i) => (
                            <div
                                key={label}
                                className={cn(
                                    "py-2 text-center text-xs tracking-wide",
                                    i === SUNDAY && "text-rose-700/80",
                                    i === SATURDAY && "text-sky-700/80",
                                    i !== SUNDAY && i !== SATURDAY && "text-muted-foreground"
                                )}
                            >
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {days.map((day) => {
                            const key = toDateKey(day);
                            const inMonth = day.getMonth() === monthStart.getMonth();
                            const isToday = key === toDateKey(new Date());
                            const isSelected = key === viewingDay;
                            const holiday = holidays[key];
                            const dayEvents = events
                                .filter((e) => dayOf(e.startsAt) === key)
                                .sort((a, b) => {
                                    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
                                    return a.startsAt.localeCompare(b.startsAt);
                                });

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setEditing(null);
                                        setComposingDay(null);
                                        setViewingDay(key);
                                    }}
                                    className={cn(
                                        "min-h-12 border-b border-r border-white/30 p-1 text-left align-top transition-colors sm:min-h-24 sm:p-1.5 dark:border-white/5",
                                        // Order matters: tailwind-merge keeps the last
                                        // background, so these run least- to most-specific.
                                        weekdayIndex(day) === SUNDAY && "bg-rose-400/15",
                                        weekdayIndex(day) === SATURDAY && "bg-sky-400/15",
                                        holiday && "bg-rose-400/10",
                                        // Out-of-month days mute the wash instead of tinting it.
                                        !inMonth && "bg-neutral-500/10",
                                        isToday && "bg-rose-500/20",
                                        isSelected && "bg-violet-300/30 ring-2 ring-inset ring-violet-400/70",
                                        "hover:bg-white/30"
                                    )}
                                >
                                    <div className="mb-1 flex min-w-0 items-start gap-1">
                                        <span
                                            className={cn(
                                                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                                            isToday && "bg-rose-500 font-medium text-white",
                                                !isToday && !inMonth && "text-muted-foreground/50",
                                                !isToday && inMonth && "text-foreground",
                                                !isToday && holiday && "font-medium text-rose-700 dark:text-rose-300"
                                            )}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {holiday && (
                                            <span className="hidden truncate pt-0.5 text-[10px] leading-none text-rose-700 sm:block dark:text-rose-300">
                                                {holiday}
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone cells are too narrow for tags, so they show
                                        dots; the day dialog lists the actual events. */}
                                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                                        {holiday && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-label={holiday} />}
                                        {dayEvents.map((event) => (
                                            <span
                                                key={event.id}
                                                className={cn("h-1.5 w-1.5 rounded-full", eventDot(event))}
                                            />
                                        ))}
                                    </div>

                                    <div className="hidden space-y-0.5 sm:block">
                                        {dayEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setComposingDay(null);
                                                    setViewingDay(null);
                                                    setEditing(event);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key !== "Enter" && e.key !== " ") return;
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setComposingDay(null);
                                                    setViewingDay(null);
                                                    setEditing(event);
                                                }}
                                                className={cn(
                                                    "truncate rounded border px-1 py-0.5 text-[10px] hover:brightness-95",
                                                    eventStyle(event)
                                                )}
                                            >
                                                {!event.allDay && (
                                                    <span className="mr-1 font-mono tabular-nums">
                                                        {timeOf(event.startsAt)}
                                                    </span>
                                                )}
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {/* Week view is an agenda: one wide row per day, stacked over the
                seven days. Tapping a day opens its read view; tapping a tag
                edits it directly. */}
            {viewMode === "week" && (
                <div className={cn(GLASS_PANEL, "overflow-hidden bg-white/70 dark:bg-neutral-900/60")}>
                    {days.map((day) => {
                        const key = toDateKey(day);
                        const wi = weekdayIndex(day);
                        const isToday = key === todayKey;
                        const isSelected = key === viewingDay;
                        const holiday = holidays[key];
                        const dayEvents = events
                            .filter((e) => dayOf(e.startsAt) === key)
                            .sort((a, b) => {
                                if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
                                return a.startsAt.localeCompare(b.startsAt);
                            });

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setEditing(null);
                                    setComposingDay(null);
                                    setViewingDay(key);
                                }}
                                className={cn(
                                    "flex min-h-16 w-full border-b border-white/30 text-left transition-colors last:border-b-0 sm:min-h-20 dark:border-white/5",
                                    wi === SUNDAY && "bg-rose-400/15",
                                    wi === SATURDAY && "bg-sky-400/15",
                                    holiday && "bg-rose-400/10",
                                    isToday && "bg-rose-500/20",
                                    isSelected && "bg-violet-300/30 ring-2 ring-inset ring-violet-400/70",
                                    "hover:bg-white/30"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-white/30 text-xs dark:border-white/5",
                                        wi === SUNDAY && "text-rose-700/80",
                                        wi === SATURDAY && "text-sky-700/80"
                                    )}
                                >
                                    <span>{WEEKDAYS[wi]}</span>
                                    <span
                                        className={cn(
                                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                                            isToday && "bg-rose-500 font-medium text-white",
                                            !isToday && "text-foreground",
                                            !isToday && holiday && "font-medium text-rose-700 dark:text-rose-300"
                                        )}
                                    >
                                        {day.getDate()}
                                    </span>
                                </span>

                                <span className="flex min-w-0 flex-1 flex-wrap content-center gap-1.5 p-2">
                                    {holiday && (
                                        <span className="rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] leading-tight text-rose-700 dark:text-rose-300">
                                            {holiday}
                                        </span>
                                    )}
                                    {dayEvents.map((event) => (
                                        <span
                                            key={event.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setComposingDay(null);
                                                setViewingDay(null);
                                                setEditing(event);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key !== "Enter" && e.key !== " ") return;
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setComposingDay(null);
                                                setViewingDay(null);
                                                setEditing(event);
                                            }}
                                            className={cn(
                                                "max-w-full truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight hover:brightness-95",
                                                eventStyle(event)
                                            )}
                                        >
                                            {!event.allDay && (
                                                <span className="mr-0.5 font-mono tabular-nums">{timeOf(event.startsAt)}</span>
                                            )}
                                            {event.title}
                                        </span>
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* A selected day's details stay in the reading flow beneath the
                calendar instead of covering it in a modal. */}
            {viewingDay && !isFormOpen && (() => {
                const dayEvents = events
                    .filter((event) => dayOf(event.startsAt) === viewingDay)
                    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                const holiday = holidays[viewingDay];

                return (
                    <section className={cn(GLASS_PANEL, "space-y-3 bg-violet-50/85 p-4 dark:bg-violet-950/30 sm:p-5")}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold tracking-wide">
                                {Number(viewingDay.slice(5, 7))}/{Number(viewingDay.slice(8, 10))} の予定
                            </h2>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                    const day = viewingDay;
                                    setViewingDay(null);
                                    setComposingDay(day);
                                }}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                予定を追加
                            </Button>
                        </div>

                        {dayEvents.length === 0 && !holiday ? (
                            <p className="py-2 text-sm text-muted-foreground">予定はありません</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {holiday && (
                                    <li className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                                        祝日：{holiday}
                                    </li>
                                )}
                                {dayEvents.map((event) => (
                                    <li key={event.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setViewingDay(null);
                                                setEditing(event);
                                            }}
                                            className={cn(
                                                "flex w-full items-baseline gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition hover:brightness-95",
                                                eventStyle(event)
                                            )}
                                        >
                                            <span className="font-mono text-xs tabular-nums">
                                                {event.allDay ? "終日" : timeOf(event.startsAt)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium">{event.title}</span>
                                                {(event.place || event.note) && (
                                                    <span className="block truncate text-xs opacity-70">
                                                        {[event.place, event.note].filter(Boolean).join(" ・ ")}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="ml-auto shrink-0 text-xs opacity-60">{ownerLabel(event.owner)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })()}

            <div className="grid gap-4 md:grid-cols-2">
            <section className={cn(GLASS_PANEL, "space-y-3 bg-sky-50/80 p-4 dark:bg-sky-950/30 sm:p-5")}>
                <div>
                    <h2 className="text-base font-semibold tracking-wide">今週の予定</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {Number(thisWeekStartKey.slice(5, 7))}/{Number(thisWeekStartKey.slice(8, 10))}〜{thisWeekLastDay.getMonth() + 1}/{thisWeekLastDay.getDate()}
                    </p>
                </div>
                {thisWeekEvents.length === 0 ? (
                    <p className="py-1 text-sm text-muted-foreground">今週の予定はありません</p>
                ) : (
                    <ul className="space-y-1.5">
                        {thisWeekEvents.map((event) => (
                            <li key={event.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setViewingDay(dayOf(event.startsAt));
                                        setEditing(event);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition hover:brightness-95",
                                        eventStyle(event)
                                    )}
                                >
                                    <span className="shrink-0 font-mono text-xs tabular-nums">
                                        {Number(dayOf(event.startsAt).slice(5, 7))}/{Number(dayOf(event.startsAt).slice(8, 10))}
                                        {event.allDay ? " 終日" : ` ${timeOf(event.startsAt)}`}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
                                    <span className="shrink-0 text-xs opacity-60">{ownerLabel(event.owner)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={cn(GLASS_PANEL, "space-y-3 bg-amber-50/80 p-4 dark:bg-amber-950/30 sm:p-5")}>
                <div>
                    <h2 className="text-base font-semibold tracking-wide">来週の予定</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {Number(nextWeekStartKey.slice(5, 7))}/{Number(nextWeekStartKey.slice(8, 10))}〜{nextWeekLastDay.getMonth() + 1}/{nextWeekLastDay.getDate()}
                    </p>
                </div>
                {nextWeekEvents.length === 0 ? (
                    <p className="py-1 text-sm text-muted-foreground">来週の予定はありません</p>
                ) : (
                    <ul className="space-y-1.5">
                        {nextWeekEvents.map((event) => (
                            <li key={event.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setViewingDay(dayOf(event.startsAt));
                                        setEditing(event);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition hover:brightness-95",
                                        eventStyle(event)
                                    )}
                                >
                                    <span className="shrink-0 font-mono text-xs tabular-nums">
                                        {Number(dayOf(event.startsAt).slice(5, 7))}/{Number(dayOf(event.startsAt).slice(8, 10))}
                                        {event.allDay ? " 終日" : ` ${timeOf(event.startsAt)}`}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
                                    <span className="shrink-0 text-xs opacity-60">{ownerLabel(event.owner)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            </div>
        </div>
    );
}

interface EventFormProps {
    event: CalendarEvent | null;
    defaultDay: string;
    onSaved: (event: CalendarEvent) => void;
    onDelete?: () => void;
    onCancel: () => void;
    onError: (message: string) => void;
}

function EventForm({ event, defaultDay, onSaved, onDelete, onCancel, onError }: EventFormProps) {
    const [title, setTitle] = useState(event?.title ?? "");
    const [owner, setOwner] = useState<OwnerId>(event?.owner ?? "family");
    const [day, setDay] = useState(event ? dayOf(event.startsAt) : defaultDay);
    const [startTime, setStartTime] = useState(event ? timeOf(event.startsAt) : "09:00");
    const [allDay, setAllDay] = useState(event?.allDay ?? false);
    const [place, setPlace] = useState(event?.place ?? "");
    const [note, setNote] = useState(event?.note ?? "");
    const [isSaving, setIsSaving] = useState(false);

    async function save(fields: { title: string; owner: OwnerId; allDay: boolean; place?: string; note?: string }) {
        setIsSaving(true);
        try {
            const payload = {
                id: event?.id,
                title: fields.title,
                owner: fields.owner,
                startsAt: `${day}T${fields.allDay ? "00:00" : startTime}`,
                allDay: fields.allDay,
                place: fields.place ?? "",
                note: fields.note ?? "",
            };
            const res = await fetch("/api/schedule", {
                method: event ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            onSaved(data.event);
        } catch (err) {
            onError(err instanceof Error ? err.message : "保存できませんでした");
        } finally {
            setIsSaving(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        save({ title, owner, allDay, place, note });
    }

    // No card of its own: the sheet is already the surface.
    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="予定のタイトル"
                autoFocus
                className="w-full border-b border-border bg-transparent pb-1 text-base outline-none focus:border-primary"
            />

            {/* One-tap presets: fill the common cases so no typing is needed.
                Only when creating — editing already has its values. */}
            {!event && (
                <div className="flex flex-wrap gap-1.5">
                    {EVENT_PRESETS.map((preset) => (
                        <Button
                            key={preset.label}
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            className={cn("h-7 rounded-full text-xs", OWNER_STYLES[preset.owner])}
                            onClick={() => save({ title: preset.label, owner: preset.owner, allDay: preset.allDay })}
                        >
                            <Plus className="mr-1 h-3 w-3" />
                            {preset.label}
                        </Button>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex rounded-md border border-border p-0.5">
                    {OWNERS.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => setOwner(o.id)}
                            className={cn(
                                "rounded px-3 py-1 transition-colors",
                                owner === o.id ? OWNER_STYLES[o.id] : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                <input
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="rounded-md border border-border bg-transparent px-2 py-1"
                />

                <label className="flex items-center gap-1.5 text-muted-foreground">
                    <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                    終日
                </label>

                {!allDay && (
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        step={300}
                        className="rounded-md border border-border bg-transparent px-2 py-1 tabular-nums"
                    />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    maxLength={PLACE_MAX_LENGTH}
                    placeholder="場所（任意）"
                    className="min-w-32 flex-1 rounded-md border border-border bg-transparent px-2 py-1"
                />
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={NOTE_MAX_LENGTH}
                    placeholder="メモ（任意）"
                    className="min-w-32 flex-[2] rounded-md border border-border bg-transparent px-2 py-1"
                />
            </div>

            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSaving} className="text-xs">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : event ? "更新" : "追加"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onCancel}>
                    キャンセル
                </Button>
                {onDelete && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-xs text-destructive hover:text-destructive"
                        onClick={onDelete}
                    >
                        削除
                    </Button>
                )}
            </div>
        </form>
    );
}
