import { Calendar } from "@/components/schedule/Calendar";
import { SiteNav } from "@/components/layout/SiteNav";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { fetchCalendarEvents, shiftDays } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

/** First day of the current month, as a local "YYYY-MM-DD". */
function currentMonthStart(): string {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-01`;
}

export default async function SchedulePage() {
    const monthStart = currentMonthStart();
    // The month grid always shows the 42 days from the Sunday on or before the
    // 1st, so the initial fetch has to cover that whole span, not just the month.
    const gridStart = shiftDays(monthStart, -new Date(`${monthStart}T00:00:00`).getDay());
    const events = await fetchCalendarEvents(gridStart, shiftDays(gridStart, 42));

    return (
        <div className="relative min-h-screen font-sans">
            <AuroraBackground />
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-slate-900/38" />

            <SiteNav />
            {/* pt clears the fixed nav; the nav itself names the page. */}
            <main className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-10 sm:pt-12">
                <Calendar initialEvents={events} initialMonthStart={monthStart} />
            </main>
        </div>
    );
}
