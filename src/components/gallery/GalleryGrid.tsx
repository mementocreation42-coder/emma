"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import { Play } from "lucide-react";
import { MediaItem } from "./types";

interface GalleryGridProps {
    items: MediaItem[];
    onSelect: (item: MediaItem) => void;
}

export function GalleryGrid({ items, onSelect }: GalleryGridProps) {
    const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);

    return (
        <section className="py-24 px-4 bg-background">
            <div className="container mx-auto">
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 space-y-4">
                    {items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layoutId={`media-${item.id}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            onClick={() => onSelect(item)}
                            onMouseEnter={() => item.type === 'video' && setHoveredVideo(item.id)}
                            onMouseLeave={() => setHoveredVideo(null)}
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
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <CldImage
                                                src={item.src}
                                                alt={item.alt}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        )
                                    ) : (
                                        <>
                                            {/* Video Thumbnail - Direct URL */}
                                            <img
                                                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/so_0,c_fill,w_600,h_600/${item.src}.jpg`}
                                                alt={item.alt}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />

                                            {hoveredVideo === item.id && (
                                                <div className="absolute inset-0 z-10 bg-black">
                                                    <video
                                                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/so_0,du_3,c_fill,h_400,w_400/${item.src}.mp4`}
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
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
