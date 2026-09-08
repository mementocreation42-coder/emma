"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import { MediaItem } from "@/types/media";
import Image from "next/image";
import dynamic from "next/dynamic";
import { cloudinaryImageUrl } from "@/lib/cloudinary";

// video.js is heavy — only load it when a video is actually opened
const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
    ssr: false,
    loading: () => <div className="w-full aspect-video animate-pulse bg-zinc-800 rounded-lg" />,
});

interface MediaModalProps {
    selectedMedia: MediaItem | null;
    onClose: () => void;
    onNavigate: (direction: 'next' | 'prev') => void;
    hasPrev: boolean;
    hasNext: boolean;
}

interface ModalImageProps {
    src: string;
    thumbSrc?: string;
    aspectRatio: number;
    alt: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface Transform { scale: number; x: number; y: number }

// Shows the already-cached grid thumbnail instantly while the full-size image loads,
// so the modal never opens onto a black box.
// Supports pinch / ctrl+wheel zoom, drag-to-pan while zoomed, and double-tap to toggle.
function ModalImage({ src, thumbSrc, aspectRatio, alt }: ModalImageProps) {
    const [fullLoaded, setFullLoaded] = useState(false);
    const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const transformRef = useRef<Transform>(transform);
    transformRef.current = transform;

    const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
    const panLast = useRef<{ x: number; y: number } | null>(null);
    const gesture = useRef<{ startX: number; startY: number; startTime: number; moved: boolean; pinched: boolean } | null>(null);
    const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);

    const zoomed = transform.scale > 1.01;

    // Clamp so the image can't be dragged fully out of view
    const clamp = (t: Transform): Transform => {
        const el = containerRef.current;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale));
        if (!el || scale <= 1) return { scale, x: 0, y: 0 };
        const maxX = ((scale - 1) * el.clientWidth) / 2;
        const maxY = ((scale - 1) * el.clientHeight) / 2;
        return {
            scale,
            x: Math.min(maxX, Math.max(-maxX, t.x)),
            y: Math.min(maxY, Math.max(-maxY, t.y)),
        };
    };

    // Zoom around a point given in container-centre coordinates
    const zoomAt = (nextScale: number, px: number, py: number) => {
        const t = transformRef.current;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
        const ratio = scale / t.scale;
        const next = clamp({ scale, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio });
        transformRef.current = next;
        setTransform(next);
    };

    const toLocal = (clientX: number, clientY: number) => {
        const rect = containerRef.current!.getBoundingClientRect();
        return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        if (!el) return;
        try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 1) {
            gesture.current = { startX: e.clientX, startY: e.clientY, startTime: Date.now(), moved: false, pinched: false };
            panLast.current = { x: e.clientX, y: e.clientY };
        } else if (pointers.current.size === 2) {
            const [a, b] = Array.from(pointers.current.values());
            pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: transformRef.current.scale };
            if (gesture.current) gesture.current.pinched = true;
            panLast.current = null;
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.current.size === 2 && pinchStart.current) {
            const [a, b] = Array.from(pointers.current.values());
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = toLocal((a.x + b.x) / 2, (a.y + b.y) / 2);
            const nextScale = pinchStart.current.scale * (dist / pinchStart.current.dist);
            zoomAt(nextScale, mid.x, mid.y);
            return;
        }

        if (pointers.current.size === 1 && panLast.current && transformRef.current.scale > 1) {
            const dx = e.clientX - panLast.current.x;
            const dy = e.clientY - panLast.current.y;
            panLast.current = { x: e.clientX, y: e.clientY };
            if (gesture.current && Math.hypot(e.clientX - gesture.current.startX, e.clientY - gesture.current.startY) > 8) {
                gesture.current.moved = true;
            }
            const t = transformRef.current;
            const next = clamp({ ...t, x: t.x + dx, y: t.y + dy });
            transformRef.current = next;
            setTransform(next);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.delete(e.pointerId);

        if (pointers.current.size < 2) pinchStart.current = null;
        if (pointers.current.size === 1) {
            const [rest] = Array.from(pointers.current.values());
            panLast.current = rest;
            return;
        }
        if (pointers.current.size > 0) return;

        // Last finger lifted: snap back below 1x, and detect a double-tap
        const g = gesture.current;
        gesture.current = null;
        panLast.current = null;

        if (transformRef.current.scale < 1.05) {
            transformRef.current = { scale: 1, x: 0, y: 0 };
            setTransform(transformRef.current);
        }

        if (g && !g.moved && !g.pinched && Date.now() - g.startTime < 300) {
            const now = Date.now();
            const prev = lastTap.current;
            if (prev && now - prev.time < 300 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
                lastTap.current = null;
                const p = toLocal(e.clientX, e.clientY);
                if (transformRef.current.scale > 1.01) zoomAt(1, p.x, p.y);
                else zoomAt(DOUBLE_TAP_SCALE, p.x, p.y);
            } else {
                lastTap.current = { x: e.clientX, y: e.clientY, time: now };
            }
        }
    };

    // Keep the parent's swipe-to-navigate from firing while zooming or pinching
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (transformRef.current.scale > 1.01 || gesture.current?.pinched || pinchStart.current) {
            e.stopPropagation();
        }
    };

    // Trackpad pinch arrives as ctrl+wheel; React's wheel listener is passive,
    // so use a native non-passive one to stop the browser zooming the page.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            const zoomedNow = transformRef.current.scale > 1.01;
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                const rect = el.getBoundingClientRect();
                const px = e.clientX - rect.left - rect.width / 2;
                const py = e.clientY - rect.top - rect.height / 2;
                zoomAt(transformRef.current.scale * Math.exp(-e.deltaY * 0.01), px, py);
            } else if (zoomedNow) {
                // Plain scrolling pans the zoomed image instead of changing posts
                e.preventDefault();
                e.stopPropagation();
                const t = transformRef.current;
                const next = clamp({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY });
                transformRef.current = next;
                setTransform(next);
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none touch-none ${zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="relative w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'center center',
                    transition: pointers.current.size > 0 ? 'none' : 'transform 0.2s ease-out',
                    willChange: 'transform',
                }}
            >
                {thumbSrc && !fullLoaded && (
                    <Image
                        src={thumbSrc}
                        alt=""
                        fill
                        // Same sizes as GalleryGrid so the browser reuses the cached response
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-contain"
                    />
                )}
                <Image
                    width={aspectRatio < 1 ? 1080 : 1920}
                    height={aspectRatio < 1 ? 1920 : 1080}
                    src={src.startsWith('http') ? src : cloudinaryImageUrl(src)}
                    alt={alt}
                    onLoad={() => setFullLoaded(true)}
                    className={`max-h-full w-auto scale-110 object-contain pointer-events-none select-none shadow-black drop-shadow-2xl transition-opacity duration-300 ${fullLoaded ? 'opacity-100' : 'opacity-0'}`}
                    draggable={false}
                    quality={90}
                />
            </div>
        </div>
    );
}

export function MediaModal({ selectedMedia, onClose, onNavigate, hasPrev, hasNext }: MediaModalProps) {
    const [internalIndex, setInternalIndex] = useState(0);
    const lastWheelTime = useRef<number>(0);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    // Reset internal index when selectedMedia changes
    // (adjust-during-render instead of an effect: avoids a wasted re-render pass)
    const [prevMedia, setPrevMedia] = useState(selectedMedia);
    if (selectedMedia !== prevMedia) {
        setPrevMedia(selectedMedia);
        setInternalIndex(0);
    }

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
        if (now - lastWheelTime.current < 500) return; // Decreased throttle from 800ms

        if (Math.abs(e.deltaX) > 20 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { // Decreased threshold from 30
            if (e.deltaX > 0) {
                handleSwipe('next');
            } else {
                handleSwipe('prev');
            }
            lastWheelTime.current = now;
        } else if (Math.abs(e.deltaY) > 20 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            // Trackpad vertical scroll steps between posts, same direction as
            // the touch swipe: scrolling down brings in the next one.
            if (e.deltaY > 0 && hasNext) {
                onNavigate('next');
                lastWheelTime.current = now;
            } else if (e.deltaY < 0 && hasPrev) {
                onNavigate('prev');
                lastWheelTime.current = now;
            }
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

    function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
        const touch = event.touches[0];
        if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;

        const x = touch.clientX - start.x;
        const y = touch.clientY - start.y;
        if (Math.max(Math.abs(x), Math.abs(y)) < 50) return;

        // Vertical swipes change the post: swiping up pulls in the next one,
        // matching the feed convention (and the nav's follow-the-finger
        // direction). Horizontal edge swipes are reserved by mobile browsers
        // for history navigation, so photo changes intentionally use the
        // thumbnail strip instead.
        if (Math.abs(y) > Math.abs(x)) {
            if (y < 0 && hasNext) onNavigate("next");
            else if (y > 0 && hasPrev) onNavigate("prev");
        }
    }

    return (
        // AnimatePresence must stay mounted while the modal unmounts,
        // otherwise the exit animation is skipped and the close feels abrupt
        <AnimatePresence>
            {selectedMedia && activeItem && (
                // Keyed direct child (not a fragment) so AnimatePresence can track removal
                <m.div
                    key="media-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut", delay: 0.1 } }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm"
                />
            )}
            {selectedMedia && activeItem && (
                <div key="media-modal" className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-1 md:p-8">
                        <m.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: "easeOut" } }}
                            className="relative h-full w-full max-w-none overflow-hidden rounded-3xl border border-white/35 bg-white/15 shadow-[0_24px_90px_rgba(33,20,54,0.38)] backdrop-blur-2xl pointer-events-auto md:h-auto md:max-w-7xl md:border-white/45"
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{ touchAction: "none", overscrollBehavior: "contain" }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={(event) => event.preventDefault()}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(251,191,202,0.5),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(125,211,252,0.34),transparent_33%),radial-gradient(circle_at_55%_100%,rgba(253,230,138,0.28),transparent_40%)]" />

                            {/* Navigation Arrows */}


                            <div className="relative z-10 h-full md:grid md:h-[85vh] md:grid-cols-[minmax(0,1fr)_14rem]">

                                {/* Visual Content Area */}
                                <div
                                    className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950/35"
                                    onWheel={handleWheel}
                                >
                                    {activeItem.type === 'image' ? (
                                        <ModalImage
                                            key={activeItem.src}
                                            src={activeItem.src}
                                            // The first gallery image is the featured image, so its grid
                                            // thumbnail works as an instant underlay there too
                                            thumbSrc={internalIndex === 0 ? selectedMedia.thumbSrc : undefined}
                                            aspectRatio={activeItem.aspectRatio}
                                            alt={selectedMedia.alt}
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${activeItem.aspectRatio < 1 ? 'max-w-[50vh]' : ''}`}>
                                            <VideoPlayer
                                                width={activeItem.aspectRatio < 1 ? 1080 : 1920}
                                                height={activeItem.aspectRatio < 1 ? 1920 : 1080}
                                                src={activeItem.src}
                                            />
                                        </div>
                                    )}

                                    {/* Carousel Thumbnails */}
                                    {selectedMedia.gallery && selectedMedia.gallery.length > 1 && (
                                        <div className="absolute bottom-6 left-4 right-4 z-40 flex max-w-none gap-3 overflow-x-auto rounded-2xl border border-white/25 bg-white/15 px-4 py-2 backdrop-blur-md md:hidden">
                                            {selectedMedia.gallery.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={(e) => { e.stopPropagation(); setInternalIndex(idx); }}
                                                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 ${idx === internalIndex ? 'scale-110 border-violet-100 shadow-lg' : 'border-transparent opacity-60 hover:scale-105 hover:opacity-100'}`}
                                                >
                                                    <Image
                                                        src={item.src.startsWith('http')
                                                            ? item.src
                                                            : cloudinaryImageUrl(item.src, 200)}
                                                        alt={`Thumbnail ${idx + 1}`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                    />
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

                                {/* Story and close control share one row, keeping their centres aligned. */}
                                <div className="absolute left-4 right-4 top-4 z-50 flex items-center gap-4 md:static md:col-start-2 md:row-start-1 md:w-auto md:translate-y-0 md:flex-col md:items-stretch md:p-5">
                                    <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/25 bg-slate-950/25 px-3 py-2.5 text-white shadow-lg backdrop-blur-md md:flex-none md:py-3">
                                        <m.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex min-w-0 items-center gap-3 md:flex-col md:items-start md:gap-2"
                                        >
                                            <span className="shrink-0 rounded-full bg-violet-200/85 px-2.5 py-1 text-xs font-medium tracking-wider text-violet-950 shadow-sm">
                                                {selectedMedia.date.replace(/-/g, '/')}
                                            </span>
                                            <h3 className="min-w-0 shrink truncate whitespace-nowrap text-base font-semibold text-white md:text-lg">
                                                {selectedMedia.alt}
                                            </h3>
                                            {selectedMedia.description && (
                                                <>
                                                    <span aria-hidden="true" className="h-4 w-px shrink-0 bg-white/35" />
                                                    <p className="min-w-0 flex-1 truncate whitespace-nowrap font-sans text-sm tracking-wide text-white/80">
                                                        {selectedMedia.description}
                                                    </p>
                                                </>
                                            )}

                                            {selectedMedia.transcription && (
                                                <span className="hidden max-w-48 shrink truncate whitespace-nowrap text-sm italic text-white/75 md:inline">
                                                    &ldquo;{selectedMedia.transcription}&rdquo;
                                                </span>
                                            )}
                                        </m.div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="shrink-0 rounded-full border border-white/35 bg-white/20 p-2 text-white/90 backdrop-blur-md transition-colors hover:bg-violet-200/40 md:order-first md:self-end"
                                    >
                                        <X size={24} />
                                    </button>
                                    {selectedMedia.gallery && selectedMedia.gallery.length > 1 && (
                                        <div className="hidden gap-2 overflow-x-auto rounded-2xl border border-white/25 bg-white/15 p-2 backdrop-blur-md md:mt-auto md:flex">
                                            {selectedMedia.gallery.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={(e) => { e.stopPropagation(); setInternalIndex(idx); }}
                                                    className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-300 ${idx === internalIndex ? 'border-violet-100 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                >
                                                    <Image
                                                        src={item.src.startsWith('http') ? item.src : cloudinaryImageUrl(item.src, 200)}
                                                        alt={`Thumbnail ${idx + 1}`}
                                                        fill
                                                        className="object-cover"
                                                        sizes="44px"
                                                    />
                                                    {item.type === 'video' && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play size={12} className="fill-white text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </m.div>
                </div>
            )}
        </AnimatePresence>
    );
}
