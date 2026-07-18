"use client";

import { cn } from "@/lib/utils";

interface SidebarProps {
    years: {
        year: string;
        months: string[];
    }[];
    selectedDate: string | null; // "YYYY", "YYYY-MM", or null
    onSelectDate: (date: string | null) => void;
}

export function Sidebar({ years, selectedDate, onSelectDate }: SidebarProps) {
    return (
        <aside className="sticky top-3 z-20 -mx-4 mb-6 px-4 md:top-6 md:mx-0 md:px-0">
            <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/45 p-2 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.22)] backdrop-blur-md">
                <div className="flex w-max items-center gap-3">
                    <button
                        onClick={() => onSelectDate(null)}
                        className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-serif transition-colors",
                            selectedDate === null ? "bg-violet-300/75 font-semibold text-violet-950 shadow-sm" : "text-muted-foreground"
                        )}
                    >
                        All
                    </button>

                    {years.map((group) => (
                        <div key={group.year} className="flex items-center gap-1.5 border-l border-border/60 pl-3">
                            <button
                                onClick={() => onSelectDate(group.year)}
                                className={cn(
                                    "rounded-full px-2 py-1.5 text-xs font-semibold transition-colors",
                                    selectedDate === group.year ? "bg-violet-300/75 text-violet-950 shadow-sm" : "text-foreground/80 hover:bg-white/60"
                                )}
                            >
                                {group.year}
                            </button>
                            {selectedDate?.startsWith(group.year) && group.months.map((month) => {
                                const dateInfo = `${group.year}-${month}`;
                                return (
                                    <button
                                        key={month}
                                        onClick={() => onSelectDate(dateInfo)}
                                        className={cn(
                                            "rounded-full px-2 py-1.5 text-xs transition-colors",
                                            selectedDate === dateInfo ? "bg-violet-300/75 text-violet-950 shadow-sm" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                                        )}
                                    >
                                        {new Date(`${group.year}-${month}-01`).toLocaleString('en-US', { month: 'short' })}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
