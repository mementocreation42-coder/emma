"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import { Play } from "lucide-react";
import { MediaItem } from "./types";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

interface GalleryGridProps {
    items: MediaItem[];
    onSelect: (item: MediaItem) => void;
}

interface GalleryItemProps {
    item: MediaItem;
    index: number;
    onSelect: (item: MediaItem) => void;
}

const GalleryItem = memo(function GalleryItem({ item, index, onSelect }: GalleryItemProps) {
    const [hoveredVideo, setHoveredVideo] = useState(false);

    const thumbnailUrl = useMemo(
        () => item.type === 'video' ? `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,c_fill,w_400,h_400,f_auto,q_auto/${item.src}.jpg` : null,
        [item.type, item.src]
    );
    const videoUrl = useMemo(
        () => item.type === 'video' ? `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,du_3,c_fill,h_400,w_400,q_auto/${item.src}.mp4` : null,
        [item.type, item.src]
    );

    // Cap delay so large galleries don't have items fading in after 5+ seconds
    const animationDelay = Math.min(index * 0.05, 0.5);

    return (
        <motion.div
            layoutId={`media-${item.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: animationDelay }}
            onClick={() => onSelect(item)}
            onMouseEnter={() => item.type === 'video' && setHoveredVideo(true)}
            onMouseLeave={() => setHoveredVideo(false)}
            className="relative cursor-pointer group break-inside-avoid overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800"
        >
            <div className="relative w-full" style={{ paddingBottom: `${(1 / item.aspectRatio) * 100}%` }}>
                <div className="absolute inset-0">
                    {item.type === 'image' ? (
                        item.src.startsWith('http') ? (
                            <Image
                                src={item.src}
                                alt={item.alt}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                priority={index < 4}
                                loading={index < 4 ? undefined : "lazy"}
                            />
                        ) : (
                            <CldImage
                                src={item.src}
                                alt={item.alt}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                quality={75}
                                priority={index < 4}
                                loading={index < 4 ? undefined : "lazy"}
                            />
                        )
                    ) : (
                        <>
                            <img
                                src={thumbnailUrl!}
                                alt={item.alt}
                                loading={index < 8 ? "eager" : "lazy"}
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {hoveredVideo && (
                                <div className="absolute inset-0 z-10 bg-black">
                                    <video
                                        src={videoUrl!}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                            )}

                            <div className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 rounded-full text-white/90">
                                <Play size={12} fill="currentColor" />
                            </div>
                        </>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
            </div>
        </motion.div>
    );
});

export function GalleryGrid({ items, onSelect }: GalleryGridProps) {
    return (
        <section className="py-24 px-4 bg-background">
            <div className="container mx-auto">
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 space-y-4">
                    {items.map((item, index) => (
                        <GalleryItem key={item.id} item={item} index={index} onSelect={onSelect} />
                    ))}
                </div>
            </div>
        </section>
    );
}
