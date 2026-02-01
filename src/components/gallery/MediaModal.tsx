"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Music, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "./types";
import { CldImage, CldVideoPlayer } from "next-cloudinary";
import Image from "next/image";
import 'next-cloudinary/dist/cld-video-player.css';

interface MediaModalProps {
    selectedMedia: MediaItem | null;
    onClose: () => void;
    onNavigate: (direction: 'next' | 'prev') => void;
    hasPrev: boolean;
    hasNext: boolean;
}

export function MediaModal({ selectedMedia, onClose, onNavigate, hasPrev, hasNext }: MediaModalProps) {
    const [internalIndex, setInternalIndex] = useState(0);
    const lastWheelTime = useRef<number>(0);

    // Reset internal index when selectedMedia changes
    useEffect(() => {
        setInternalIndex(0);
    }, [selectedMedia]);

    const activeItem = selectedMedia?.gallery ? selectedMedia.gallery[internalIndex] : selectedMedia;
    const hasInternalPrev = internalIndex > 0;
    const hasInternalNext = selectedMedia?.gallery ? internalIndex < selectedMedia.gallery.length - 1 : false;

    // Handle Swipe (Internal Navigation ONLY)
    const handleSwipe = (direction: 'next' | 'prev') => {
        if (direction === 'next' && hasInternalNext) {
            setInternalIndex(prev => prev + 1);
        } else if (direction === 'prev' && hasInternalPrev) {
            setInternalIndex(prev => prev - 1);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const now = Date.now();
        if (now - lastWheelTime.current < 800) return;

        if (Math.abs(e.deltaX) > 30 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            if (e.deltaX > 0) {
                handleSwipe('next');
            } else {
                handleSwipe('prev');
            }
            lastWheelTime.current = now;
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedMedia) return;

            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && hasNext) onNavigate('next');
            if (e.key === 'ArrowLeft' && hasPrev) onNavigate('prev');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedMedia, onClose, onNavigate, hasNext, hasPrev]);

    const swipeConfidenceThreshold = 50;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    if (!activeItem || !selectedMedia) return null;

    return (
        <AnimatePresence>
            {selectedMedia && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 md:p-8">
                        <motion.div
                            layoutId={`media-${selectedMedia.id}`}
                            className="relative w-full max-w-7xl bg-transparent pointer-events-auto overflow-hidden rounded-2xl shadow-2xl"
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = swipePower(offset.x, velocity.x);
                                if (swipe < -swipeConfidenceThreshold) {
                                    handleSwipe("next");
                                } else if (swipe > swipeConfidenceThreshold) {
                                    handleSwipe("prev");
                                }
                            }}
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 text-white/80 backdrop-blur-md hover:bg-black/40 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            {/* Navigation Arrows */}


                            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] h-[80vh] md:h-auto bg-zinc-900">

                                {/* Visual Content Area */}
                                <div
                                    className="relative flex items-center justify-center bg-black h-full min-h-[50vh]"
                                    onWheel={handleWheel}
                                >
                                    {/* Navigation Arrows (Inside Visual Area) */}
                                    {hasPrev && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
                                            className="hidden md:flex absolute top-1/2 left-4 z-50 -translate-y-1/2 p-3 rounded-full bg-black/5 text-white/70 backdrop-blur-md hover:bg-black/10 transition-colors"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                    )}
                                    {hasNext && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
                                            className="hidden md:flex absolute top-1/2 right-4 z-50 -translate-y-1/2 p-3 rounded-full bg-black/5 text-white/70 backdrop-blur-md hover:bg-black/10 transition-colors"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    )}
                                    {activeItem.type === 'image' ? (
                                        <div
                                            className="w-full h-full flex items-center justify-center pointer-events-none select-none"
                                            onDragStart={(e) => e.preventDefault()}
                                        >
                                            {activeItem.src.startsWith('http') ? (
                                                <Image
                                                    width={activeItem.aspectRatio < 1 ? 1080 : 1920}
                                                    height={activeItem.aspectRatio < 1 ? 1920 : 1080}
                                                    src={activeItem.src}
                                                    alt={selectedMedia.alt}
                                                    className="max-h-full w-auto object-contain pointer-events-none select-none shadow-black drop-shadow-2xl"
                                                    draggable={false}
                                                    quality={90}
                                                />
                                            ) : (
                                                <CldImage
                                                    width={activeItem.aspectRatio < 1 ? 1080 : 1920}
                                                    height={activeItem.aspectRatio < 1 ? 1920 : 1080}
                                                    src={activeItem.src}
                                                    alt={selectedMedia.alt}
                                                    className="max-h-full w-auto object-contain pointer-events-none select-none shadow-black drop-shadow-2xl"
                                                    draggable={false}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${activeItem.aspectRatio < 1 ? 'max-w-[50vh]' : ''}`}>
                                            <CldVideoPlayer
                                                width={activeItem.aspectRatio < 1 ? 1080 : 1920}
                                                height={activeItem.aspectRatio < 1 ? 1920 : 1080}
                                                src={activeItem.src}
                                                colors={{
                                                    accent: '#ffffff',
                                                    base: '#000000',
                                                    text: '#ffffff'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Carousel Thumbnails */}
                                    {selectedMedia.gallery && selectedMedia.gallery.length > 1 && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-40 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl overflow-x-auto max-w-full">
                                            {selectedMedia.gallery.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={(e) => { e.stopPropagation(); setInternalIndex(idx); }}
                                                    className={`relative w-12 h-12 shrink-0 rounded-md overflow-hidden transition-all duration-300 border-2 ${idx === internalIndex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                                >
                                                    {item.src.startsWith('http') ? (
                                                        <Image
                                                            src={item.src}
                                                            alt={`Thumbnail ${idx + 1}`}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                        />
                                                    ) : (
                                                        <CldImage
                                                            src={item.src}
                                                            alt={`Thumbnail ${idx + 1}`}
                                                            fill
                                                            className="object-cover"
                                                            format="jpg"
                                                            sizes="48px"
                                                        />
                                                    )}
                                                    {item.type === 'video' && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play size={12} className="text-white fill-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Text/Story Area */}
                                <div className="flex flex-col justify-center p-8 text-white h-auto overflow-y-auto border-t md:border-t-0 md:border-l border-white/10">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <span className="inline-block px-3 py-1 mb-4 text-xs font-medium tracking-wider text-black bg-primary rounded-full">
                                            {new Date(selectedMedia.date).toLocaleDateString()}
                                        </span>
                                        <h3 className="mb-4 text-2xl font-serif font-light leading-snug text-white/90">
                                            {selectedMedia.alt}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-zinc-400 font-sans tracking-wide">
                                            {selectedMedia.description || "No description provided."}
                                        </p>

                                        {selectedMedia.transcription && (
                                            <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/5">
                                                <p className="text-lg font-serif italic text-white/80">
                                                    "{selectedMedia.transcription}"
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>

                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
