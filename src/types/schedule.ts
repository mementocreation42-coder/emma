/**
 * Events are stored as ordinary WordPress posts in this category, so the
 * gallery must exclude it and the calendar must filter to it.
 */
export const SCHEDULE_CATEGORY_SLUG = 'schedule';

export type OwnerId = 'husband' | 'wife' | 'ema' | 'family';

export const OWNERS: { id: OwnerId; label: string }[] = [
    { id: 'husband', label: '夫' },
    { id: 'wife', label: '妻' },
    { id: 'ema', label: '永茉' },
    { id: 'family', label: '家族' },
];

/** One-tap events. Tapping a quick button fills the form so only 追加 remains. */
export interface EventPreset {
    label: string;
    owner: OwnerId;
    allDay: boolean;
}

export const EVENT_PRESETS: EventPreset[] = [
    { label: '保育日', owner: 'ema', allDay: true },
];

export const TITLE_MAX_LENGTH = 60;
export const PLACE_MAX_LENGTH = 60;
export const NOTE_MAX_LENGTH = 300;

/**
 * An entry records that something happened on a day, not how long it took.
 * Duration is deliberately absent: a calendar can only ever measure scheduled
 * time, and almost none of the time actually spent together is scheduled — so
 * any total it produced would understate the thing it claimed to count.
 */
export interface CalendarEvent {
    id: string;
    title: string;
    owner: OwnerId;
    /** Local wall-clock "YYYY-MM-DDTHH:MM"; the time half is ignored when allDay. */
    startsAt: string;
    allDay: boolean;
    place: string;
    note: string;
}

export function ownerLabel(owner: OwnerId): string {
    return OWNERS.find((o) => o.id === owner)?.label ?? owner;
}

export function isOwnerId(value: unknown): value is OwnerId {
    return value === 'husband' || value === 'wife' || value === 'ema' || value === 'family';
}

/** "YYYY-MM-DD" of an ISO wall-clock string. */
export function dayOf(isoLocal: string): string {
    return isoLocal.slice(0, 10);
}

/** "HH:MM" of an ISO wall-clock string. */
export function timeOf(isoLocal: string): string {
    return isoLocal.slice(11, 16);
}
