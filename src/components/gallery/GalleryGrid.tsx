"use client";

import { memo, useMemo, useState } from "react";
import { m } from "framer-motion";
import Image from "next/image";
import { Play } from "lucide-react";
import { MediaItem } from "@/types/media";
import { cloudinaryImageUrl, cloudinaryVideoThumbUrl, cloudinaryVideoPreviewUrl } from "@/lib/cloudinary";

interface GalleryGridProps {
    items: MediaItem[];
    onSelect: (item: MediaItem) => void;
    showMonthHeadings?: boolean;
}

/**
 * One tile. Extracted and memoized so hovering a single video only re-renders
 * that card — previously the hover state lived on the grid, so every hover
 * re-rendered the entire (potentially hundreds of items) gallery.
 */
const GalleryCard = memo(function GalleryCard({
    item,
    index,
    onSelect,
}: {
    item: MediaItem;
    index: number;
    onSelect: (item: MediaItem) => void;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
            onClick={() => onSelect(item)}
            onMouseEnter={() => item.type === "video" && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative cursor-pointer group break-inside-avoid overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800"
        >
            <div className="relative w-full" style={{ paddingBottom: `${(1 / item.aspectRatio) * 100}%` }}>
                <div className="absolute inset-0">
                    {item.type === "image" ? (
                        <Image
                            src={item.src.startsWith("http")
                                ? (item.thumbSrc || item.src)
                                : cloudinaryImageUrl(item.thumbSrc || item.src, 800)}
                            alt={item.alt}
                            fill
                            sizes="(max-width: 639px) 33vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <>
                            <img
                                src={cloudinaryVideoThumbUrl(item.src)}
                                alt={item.alt}
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {isHovered && (
                                <div className="absolute inset-0 z-10 bg-black">
                                    <video
                                        src={cloudinaryVideoPreviewUrl(item.src)}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                            )}

                            <div className="absolute top-2 right-2 z-20 p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white/90">
                                <Play size={12} fill="currentColor" />
                            </div>
                        </>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
            </div>
        </m.div>
    );
});

export function GalleryGrid({ items, onSelect, showMonthHeadings = true }: GalleryGridProps) {
    const displayGroups = useMemo(() => {
        if (!showMonthHeadings) return [{ month: "", items }];

        return items.reduce<Array<{ month: string; items: MediaItem[] }>>((groups, item) => {
            const month = item.date.slice(0, 7);
            const currentGroup = groups.at(-1);

            if (currentGroup?.month === month) {
                currentGroup.items.push(item);
            } else {
                groups.push({ month, items: [item] });
            }

            return groups;
        }, []);
    }, [items, showMonthHeadings]);

    return (
        <section className="py-24 px-4 bg-background">
            <div className="container mx-auto max-w-4xl">
                <div className="space-y-14">
                    {displayGroups.map((group) => (
                        <section key={group.month}>
                            {showMonthHeadings && (
                                <h3 className="mb-4 text-lg font-semibold tracking-wide text-foreground/90 sm:text-xl">
                                    {new Date(`${group.month}-01`).toLocaleString('en-US', { year: 'numeric', month: 'long' })}
                                </h3>
                            )}
                            <div className="columns-3 gap-2 space-y-2 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3">
                                {group.items.map((item, index) => (
                                    <GalleryCard key={item.id} item={item} index={index} onSelect={onSelect} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </section>
    );
}
