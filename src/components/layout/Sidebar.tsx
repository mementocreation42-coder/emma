"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SidebarProps {
    years: {
        year: string;
        months: string[];
    }[];
    selectedDate: string | null; // "YYYY-MM" or null
    onSelectDate: (date: string | null) => void;
}

export function Sidebar({ years, selectedDate, onSelectDate }: SidebarProps) {
    return (
        <aside className="w-full md:w-48 lg:w-64 pb-8 md:pb-0">
            <div className="sticky top-24">
                <div className="space-y-6">
                    <button
                        onClick={() => onSelectDate(null)}
                        className={cn(
                            "block text-sm transition-colors hover:text-primary text-left font-serif",
                            selectedDate === null ? "text-primary font-bold" : "text-muted-foreground"
                        )}
                    >
                        All
                    </button>

                    {years.map((group) => (
                        <div key={group.year}>
                            <div className="mb-2 text-sm font-semibold text-foreground/90 font-serif">
                                {group.year}
                            </div>
                            <ul className="space-y-2 border-l border-border ml-1 pl-3">
                                {group.months.map((month) => {
                                    const dateInfo = `${group.year}-${month}`;
                                    return (
                                        <li key={month}>
                                            <button
                                                onClick={() => onSelectDate(dateInfo)}
                                                className={cn(
                                                    "block text-sm transition-colors hover:text-foreground text-left",
                                                    selectedDate === dateInfo ? "text-foreground font-medium" : "text-muted-foreground"
                                                )}
                                            >
                                                {new Date(`${group.year}-${month}-01`).toLocaleString('en-US', { month: 'long' })}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
