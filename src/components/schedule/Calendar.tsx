"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GLASS_PANEL } from "@/components/layout/AuroraBackground";
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
    wife: "bg-rose-100 text-rose-800 border-rose-600/25 dark:bg-rose-500/15 dark:text-rose-300",
    ema: "bg-violet-100 text-violet-800 border-violet-600/25 dark:bg-violet-500/15 dark:text-violet-300",
    family: "bg-amber-100 text-amber-800 border-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300",
};

/** Solid dot per owner — the mobile stand-in for a full event tag. */
const OWNER_DOTS: Record<OwnerId, string> = {
    husband: "bg-sky-500",
    wife: "bg-rose-500",
    ema: "bg-violet-500",
    family: "bg-amber-500",
};

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

interface CalendarProps {
    initialEvents: CalendarEvent[];
    initialMonthStart: string;
}

export function Calendar({ initialEvents, initialMonthStart }: CalendarProps) {
    const [monthStart, setMonthStart] = useState(() => new Date(`${initialMonthStart}T00:00:00`));
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<CalendarEvent | null>(null);
    const [composingDay, setComposingDay] = useState<string | null>(null);
    const [showUpcoming, setShowUpcoming] = useState(true);
    const [holidays, setHolidays] = useState<HolidaysByDate>({});

    const days = monthGridDays(monthStart);
    const rangeStart = toDateKey(days[0]);
    const rangeEnd = toDateKey(addDays(days[41], 1));
    const todayKey = toDateKey(new Date());
    const upcomingEndKey = toDateKey(addDays(new Date(), 2));
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

    // Skip the fetch for the month the server already rendered.
    const [loadedMonth, setLoadedMonth] = useState(initialMonthStart);
    useEffect(() => {
        const key = toDateKey(monthStart);
        if (key === loadedMonth) return;
        setLoadedMonth(key);
        load(rangeStart, rangeEnd);
    }, [monthStart, rangeStart, rangeEnd, loadedMonth, load]);

    function shiftMonth(delta: number) {
        setMonthStart((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    }

    async function remove(id: string) {
        const previous = events;
        setEvents((current) => current.filter((e) => e.id !== id));
        setEditing(null);
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
        setError(null);
    }

    const isFormOpen = editing !== null || composingDay !== null;

    // Escape and overlay clicks are handled by the Sheet itself via onOpenChange.
    const closeForm = useCallback(() => {
        setEditing(null);
        setComposingDay(null);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="前の月">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-32 text-center font-serif text-base">
                        {monthStart.getFullYear()}年{monthStart.getMonth() + 1}月
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="次の月">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setMonthStart(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                    >
                        今月
                    </Button>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {OWNERS.map((owner) => (
                            <span key={owner.id} className="flex items-center gap-1">
                                <span className={cn("h-2 w-2 rounded-full border", OWNER_STYLES[owner.id])} />
                                {owner.label}
                            </span>
                        ))}
                    </div>
                    <Button size="sm" className="text-xs" onClick={() => setComposingDay(toDateKey(new Date()))}>
                        <Plus className="mr-1 h-3 w-3" />
                        予定を追加
                    </Button>
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
                        <DialogTitle className="font-serif text-base font-semibold tracking-wide">直近3日間の予定</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {Number(todayKey.slice(5, 7))}/{Number(todayKey.slice(8, 10))}〜{Number(upcomingEndKey.slice(5, 7))}/{Number(upcomingEndKey.slice(8, 10))}
                    </p>
                    <ul className="space-y-2">
                        {upcomingEvents.map((event) => (
                            <li key={event.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", OWNER_STYLES[event.owner])}>
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
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!open) closeForm();
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-base font-semibold tracking-wide">
                            {editing
                                ? "予定を編集"
                                : composingDay
                                    ? `${Number(composingDay.slice(5, 7))}/${Number(composingDay.slice(8, 10))} に予定を追加`
                                    : "予定を追加"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* On phones the grid only shows dots, so the day's events are
                        read (and opened for editing) here. */}
                    {composingDay && !editing && (() => {
                        const dayEvents = events
                            .filter((e) => dayOf(e.startsAt) === composingDay)
                            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                        const holiday = holidays[composingDay];
                        if (dayEvents.length === 0 && !holiday) return null;
                        return (
                            <ul className="space-y-1 border-b border-border pb-3">
                                {holiday && (
                                    <li className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                                        祝日：{holiday}
                                    </li>
                                )}
                                {dayEvents.map((event) => (
                                    <li key={event.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setComposingDay(null);
                                                setEditing(event);
                                            }}
                                            className={cn(
                                                "flex w-full items-baseline gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs hover:brightness-95",
                                                OWNER_STYLES[event.owner]
                                            )}
                                        >
                                            <span className="font-mono tabular-nums">
                                                {event.allDay ? "終日" : timeOf(event.startsAt)}
                                            </span>
                                            <span className="truncate font-medium">{event.title}</span>
                                            <span className="ml-auto shrink-0 opacity-60">
                                                {ownerLabel(event.owner)}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        );
                    })()}

                    {isFormOpen && (
                        <EventForm
                            key={editing?.id ?? composingDay ?? "new"}
                            event={editing}
                            defaultDay={composingDay ?? toDateKey(new Date())}
                            onSaved={upsert}
                            onDelete={editing ? () => remove(editing.id) : undefined}
                            onCancel={closeForm}
                            onError={setError}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <div>
                {/* Translucent, not opaque: the grid should carry the page's colour
                    rather than sit on it as a white sheet. No fixed min-width: seven
                    columns must fit a phone, so mobile cells show dots, not tags. */}
                <div className={cn("overflow-hidden", GLASS_PANEL)}>
                    <div className="grid grid-cols-7 border-b border-white/40 bg-white/25 dark:border-white/10">
                        {WEEKDAYS.map((label, i) => (
                            <div
                                key={label}
                                className={cn(
                                    "py-2 text-center font-serif text-xs tracking-wide",
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
                                        setComposingDay(key);
                                    }}
                                    className={cn(
                                        "min-h-20 border-b border-r border-white/30 p-1 text-left align-top transition-colors sm:min-h-24 sm:p-1.5 dark:border-white/5",
                                        // Order matters: tailwind-merge keeps the last
                                        // background, so these run least- to most-specific.
                                        weekdayIndex(day) === SUNDAY && "bg-rose-400/15",
                                        weekdayIndex(day) === SATURDAY && "bg-sky-400/15",
                                        holiday && "bg-rose-400/10",
                                        // Out-of-month days mute the wash instead of tinting it.
                                        !inMonth && "bg-neutral-500/10",
                                        isToday && "bg-rose-500/20",
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
                                                className={cn("h-1.5 w-1.5 rounded-full", OWNER_DOTS[event.owner])}
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
                                                    setEditing(event);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key !== "Enter" && e.key !== " ") return;
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setComposingDay(null);
                                                    setEditing(event);
                                                }}
                                                className={cn(
                                                    "truncate rounded border px-1 py-0.5 text-[10px] hover:brightness-95",
                                                    OWNER_STYLES[event.owner]
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
                className="w-full border-b border-border bg-transparent pb-1 font-serif text-base outline-none focus:border-primary"
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
