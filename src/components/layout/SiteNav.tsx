"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type TouchEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
    { href: "/admin/post", label: "New Post" },
    { href: "/", label: "Gallery" },
    { href: "/schedule", label: "Schedule" },
];

/**
 * How far a finger must travel sideways to count as a tab swipe. Low enough
 * that a flick across a pill this small registers, high enough that the drift
 * in a tap never does.
 */
const SWIPE_MIN_X = 32;

/**
 * Deliberately not in the root layout: /login must stay bare, and the nav is
 * only meaningful once past it.
 */
export function SiteNav() {
    const pathname = usePathname();
    const router = useRouter();
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);

    // Highlight the tapped tab immediately instead of waiting for the route
    // change to commit — on dynamic pages that wait made every tap feel laggy.
    // (adjust-during-render, same pattern as MediaModal's index reset)
    const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
    const [prevPathname, setPrevPathname] = useState(pathname);
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setOptimisticHref(null);
    }
    const activeHref = optimisticHref ?? pathname;
    const activeIndex = LINKS.findIndex((link) => link.href === activeHref);

    useEffect(() => {
        const handleModalChange = (event: Event) => {
            setGalleryModalOpen(Boolean((event as CustomEvent<boolean>).detail));
        };
        window.addEventListener("gallery-modal-change", handleModalChange);
        return () => window.removeEventListener("gallery-modal-change", handleModalChange);
    }, []);

    function handleTouchStart(event: TouchEvent<HTMLElement>) {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    function handleTouchEnd(event: TouchEvent<HTMLElement>) {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        // The gesture has to be mostly sideways, not just long enough: the nav
        // lets vertical scrolling pass through, and a scroll that drifts a
        // little sideways used to change tabs on its own.
        if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) <= Math.abs(dy)) return;

        // The selection follows the finger: swiping right moves to the tab on
        // the right in the row, swiping left to the one on the left. Touch
        // events only run on phones, while the links remain available everywhere.
        const nextLink = LINKS[activeIndex + (dx < 0 ? -1 : 1)];
        if (nextLink) {
            setOptimisticHref(nextLink.href);
            router.push(nextLink.href);
        }
    }

    return (
        <nav
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                // mb clears the iOS home indicator, whose swipe-up area was
                // swallowing taps that landed on the lower half of the pill.
                "fixed bottom-5 left-1/2 z-[60] mb-[env(safe-area-inset-bottom)] flex -translate-x-1/2 touch-pan-y items-center gap-1 rounded-full border border-white/60 bg-white/45 p-1.5 text-[10px] uppercase tracking-[0.14em] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.32)] backdrop-blur-md transition-[opacity,translate] duration-200 sm:bottom-8 sm:gap-2 sm:p-2 sm:text-[11px] dark:border-white/10 dark:bg-neutral-900/50",
                galleryModalOpen && "pointer-events-none translate-y-16 opacity-0"
            )}
        >
            {LINKS.map((link) => {
                const isActive = activeHref === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOptimisticHref(link.href)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            // The visible pill is only 27px tall, well under the
                            // 44px a thumb needs. after: grows the hit area past
                            // the text without moving anything, and -inset-x
                            // splits the gap between pills so no tap lands in
                            // dead space between them.
                            "relative whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors after:absolute after:-inset-x-0.5 after:-inset-y-2.5 after:content-[''] active:bg-violet-200/70 active:text-violet-950 hover:bg-violet-200/70 hover:text-violet-950 sm:px-3 dark:active:bg-violet-400/30 dark:active:text-violet-50 dark:hover:bg-violet-400/30 dark:hover:text-violet-50",
                            isActive
                                ? "bg-violet-300/75 text-violet-950 shadow-sm dark:bg-violet-400/35 dark:text-violet-50"
                                : "text-muted-foreground/80"
                        )}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
