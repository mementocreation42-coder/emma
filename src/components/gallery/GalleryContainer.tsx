"use client";

import { useState, useMemo } from "react";
import { GalleryGrid } from "./GalleryGrid";
import { Sidebar } from "../layout/Sidebar";
import { MediaItem } from "./types";
import { motion } from "framer-motion";
import { MediaModal } from "./MediaModal";

interface GalleryContainerProps {
    initialItems: MediaItem[];
}

export function GalleryContainer({ initialItems }: GalleryContainerProps) {
    const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

    // Extract unique Year-Months for the sidebar
    const dateGroups = useMemo(() => {
        const groups: Record<string, Set<string>> = {};
        initialItems.forEach(item => {
            const date = new Date(item.date);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            if (!groups[year]) groups[year] = new Set();
            groups[year].add(month);
        });

        return Object.entries(groups)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA)) // Descending Years
            .map(([year, months]) => ({
                year,
                months: Array.from(months).sort((a, b) => Number(a) - Number(b)) // Ascending Months (Jan -> Dec)
            }));
    }, [initialItems]);

    // Filter items
    const filteredItems = useMemo(() => {
        if (!selectedDateFilter) return initialItems;
        return initialItems.filter(item => item.date.startsWith(selectedDateFilter));
    }, [initialItems, selectedDateFilter]);

    // Navigation Handler
    const handleNavigate = (direction: 'next' | 'prev') => {
        if (!selectedMedia) return;

        // Find current index *within filtered items*
        const currentIndex = filteredItems.findIndex(item => item.id === selectedMedia.id);
        if (currentIndex === -1) return;

        if (direction === 'next' && currentIndex < filteredItems.length - 1) {
            setSelectedMedia(filteredItems[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            setSelectedMedia(filteredItems[currentIndex - 1]);
        }
    };

    const selectedIndex = selectedMedia ? filteredItems.findIndex(item => item.id === selectedMedia.id) : -1;
    const hasPrev = selectedIndex > 0;
    const hasNext = selectedIndex < filteredItems.length - 1 && selectedIndex !== -1;

    return (
        <section className="py-12 md:py-24 px-4 bg-background">
            <div className="container mx-auto flex flex-col md:flex-row gap-8">
                <Sidebar
                    years={dateGroups}
                    selectedDate={selectedDateFilter}
                    onSelectDate={setSelectedDateFilter}
                />

                <div className="flex-1">
                    <motion.h2
                        key={selectedDateFilter || "all"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 text-2xl font-serif font-light tracking-wide md:text-3xl"
                    >
                        {selectedDateFilter ?
                            new Date(`${selectedDateFilter}-01`).toLocaleString('en-US', { year: 'numeric', month: 'long' })
                            : "All"}
                    </motion.h2>
                    <GalleryGrid
                        items={filteredItems}
                        onSelect={setSelectedMedia}
                    />
                </div>
            </div>

            <MediaModal
                selectedMedia={selectedMedia}
                onClose={() => setSelectedMedia(null)}
                onNavigate={handleNavigate}
                hasPrev={hasPrev}
                hasNext={hasNext}
            />
        </section>
    );
}
