import { SiteNav } from "@/components/layout/SiteNav";
import { AuroraBackground, GLASS_PANEL } from "@/components/layout/AuroraBackground";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * Shown instantly while the calendar's events are fetched on the server.
 * Without it, tapping "Schedule" left the previous page frozen until two
 * sequential WordPress round-trips finished — so the tap felt slow. This
 * mirrors the real layout so the swap to live data is seamless.
 */
export default function ScheduleLoading() {
    return (
        <div className="relative min-h-screen font-sans">
            <AuroraBackground />

            <SiteNav />
            <main className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-10 sm:pt-12">
                <div className="space-y-4">
                    {/* Header row: month nav + legend/add, as placeholders. */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-md bg-foreground/5" />
                            <div className="h-5 w-24 rounded bg-foreground/10" />
                            <div className="h-8 w-8 rounded-md bg-foreground/5" />
                            <div className="h-7 w-12 rounded bg-foreground/5" />
                        </div>
                        <div className="h-8 w-28 rounded-md bg-foreground/5" />
                    </div>

                    <div className={cn("overflow-hidden", GLASS_PANEL)}>
                        <div className="grid grid-cols-7 border-b border-white/40 bg-white/25 dark:border-white/10">
                            {WEEKDAYS.map((label) => (
                                <div key={label} className="py-2 text-center text-xs tracking-wide text-muted-foreground/60">
                                    {label}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {Array.from({ length: 42 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="min-h-20 border-b border-r border-white/30 p-1.5 sm:min-h-24 dark:border-white/5"
                                >
                                    <div className="h-4 w-4 rounded-full bg-foreground/10" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
