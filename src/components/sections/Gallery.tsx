"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const photos = [
    { src: "https://images.unsplash.com/photo-1549488497-6a564979e2f4?q=80&w=2670&auto=format&fit=crop", aspectRatio: "aspect-[3/4]" },
    { src: "https://images.unsplash.com/photo-1596464716127-f9a0859b0ebb?q=80&w=2574&auto=format&fit=crop", aspectRatio: "aspect-[4/3]" },
    { src: "https://images.unsplash.com/photo-1510520625340-9a48be158913?q=80&w=2670&auto=format&fit=crop", aspectRatio: "aspect-[3/4]" },
    { src: "https://images.unsplash.com/photo-1628143431327-18ce80a42426?q=80&w=2669&auto=format&fit=crop", aspectRatio: "aspect-[4/5]" },
    { src: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=2666&auto=format&fit=crop", aspectRatio: "aspect-[3/4]" },
    { src: "https://images.unsplash.com/photo-1628891435222-06ea939794cb?q=80&w=2669&auto=format&fit=crop", aspectRatio: "aspect-[4/3]" },
    { src: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=2670&auto=format&fit=crop", aspectRatio: "aspect-[3/4]" },
    { src: "https://images.unsplash.com/photo-1595180425712-42111bb470a1?q=80&w=2671&auto=format&fit=crop", aspectRatio: "aspect-[4/5]" },
];

export function Gallery() {
    return (
        <section className="py-24 px-4 bg-muted/30">
            <div className="container mx-auto">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 text-center text-3xl font-serif font-light tracking-wide md:text-4xl"
                >
                    Shared Moments
                </motion.h2>

                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 space-y-4">
                    {photos.map((photo, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="break-inside-avoid overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <div className={`relative w-full overflow-hidden ${photo.aspectRatio}`}>
                                <Image
                                    src={photo.src}
                                    alt={`Gallery photo ${index + 1}`}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-500 hover:scale-105"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
